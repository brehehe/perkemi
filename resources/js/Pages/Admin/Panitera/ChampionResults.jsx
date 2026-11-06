import Badge from '@/Components/UI/Elements/Badge';
import Button from '@/Components/UI/Elements/Button';
import AlertConfirm from '@/Components/UI/Feedback/AlertConfirm';
import Combobox from '@/Components/UI/Forms/Combobox';
import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessage from './Partials/FlashMessage';
import PaniteraHeader from './Partials/PaniteraHeader';
import EmbuRankingsView from './Partials/EmbuRankingsView';
import RandoriBracketTree from './Partials/RandoriBracketTree';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

function getRankInfo(rankNum, totalFilled = 4, modeRank4 = 'shared_bronze') {
    if (rankNum === 1) {
        return { label: 'Juara 1', medal: 'Emas', icon: 'fa-trophy', color: 'border-amber-300 bg-amber-50 text-amber-800' };
    }
    if (rankNum === 2) {
        return { label: 'Juara 2', medal: 'Perak', icon: 'fa-medal', color: 'border-slate-300 bg-slate-50 text-slate-700' };
    }
    if (rankNum === 3) {
        const isShared = totalFilled >= 4 && modeRank4 === 'shared_bronze';
        return {
            label: isShared ? 'Juara 3 Bersama' : 'Juara 3',
            medal: 'Perunggu',
            icon: 'fa-medal',
            color: 'border-orange-300 bg-orange-50 text-orange-800',
        };
    }
    if (rankNum === 4) {
        const isShared = modeRank4 === 'shared_bronze';
        return {
            label: isShared ? 'Juara 3 Bersama' : 'Juara 4',
            medal: isShared ? 'Perunggu' : 'Peringkat 4',
            icon: isShared ? 'fa-medal' : 'fa-award',
            color: isShared ? 'border-orange-300 bg-orange-50 text-orange-800' : 'border-blue-300 bg-blue-50 text-blue-800',
        };
    }
    return { label: `Peringkat ${rankNum}`, medal: '—', icon: 'fa-award', color: 'border-slate-300 bg-slate-50 text-slate-700' };
}

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

// Komponen Medali Juara dengan Nama Atlet & Nama Kontingen
function ChampionMedalsList({ champions, modeRank4 = 'shared_bronze' }) {
    if (!champions || champions.length === 0) return null;

    return (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {champions.map((champ) => {
                const rankNum = Number(champ.rank);
                const info = getRankInfo(rankNum, champions.length, modeRank4);
                const isGold = rankNum === 1;
                const isSilver = rankNum === 2;
                const displayRankLabel = champ.rank_label || info.label;

                return (
                    <div
                        key={champ.id || champ.rank}
                        className={`rounded-xl border p-3.5 shadow-2xs transition-all ${
                            isGold
                                ? 'border-amber-300 bg-amber-50/70'
                                : isSilver
                                ? 'border-slate-300 bg-slate-50/70'
                                : rankNum === 4 && modeRank4 === 'fourth_place'
                                ? 'border-blue-200 bg-blue-50/50'
                                : 'border-orange-200 bg-orange-50/50'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                                isGold
                                    ? 'bg-amber-500 text-slate-950'
                                    : isSilver
                                    ? 'bg-slate-300 text-slate-800'
                                    : rankNum === 4 && modeRank4 === 'fourth_place'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-amber-700 text-white'
                            }`}>
                                <i className={`fa-solid ${info.icon} text-[9px]`} />
                                {displayRankLabel} · {info.medal}
                            </span>
                            <span className="text-xs font-black text-slate-400">#{rankNum}</span>
                        </div>
                        <p className="font-bold text-slate-900 text-xs sm:text-sm leading-snug break-words">
                            {champ.label}
                        </p>
                        {champ.contingent_name && (
                            <p className="mt-1 text-[11px] font-medium text-slate-600 flex items-center gap-1 truncate" title={champ.contingent_name}>
                                <i className="fa-solid fa-shield-halved text-[9px] text-slate-400 shrink-0" />
                                {champ.contingent_name}
                            </p>
                        )}
                        {champ.basis && (
                            <p className="mt-1 text-[10px] text-amber-800/80 italic">
                                {champ.basis}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function ChampionEditor({ activeEvent, championship, canManage, matches = [], embuData = null }) {
    const { errors = {} } = usePage().props;
    const [confirmation, setConfirmation] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [isManualExpanded, setIsManualExpanded] = useState(championship.current_champions.length === 0);
    const [modeRank4, setModeRank4] = useState('shared_bronze');

    const draftByRank = useMemo(() => Object.fromEntries((championship.draft_champions || []).map((champion) => [Number(champion.rank), champion.participant_key])), [championship.draft_champions]);

    // Selalu tampilkan 4 posisi juara jika bagan tersedia atau peserta >= 3 (Juara 3 Bersama ke-2 opsional)
    const slotCount = championship.has_drawing || (championship.participant_count ?? 0) >= 3
        ? 4
        : (championship.required_champion_count || 4);

    const initialChampions = Array.from({ length: slotCount }, (_, index) => ({
        rank: index + 1,
        participant_key: draftByRank[index + 1] || '',
    }));
    const form = useForm({
        event_id: activeEvent.id,
        champions: initialChampions,
    });

    const filledChampions = form.data.champions.filter((champion) => Boolean(champion.participant_key));
    const selectedKeys = filledChampions.map((champion) => champion.participant_key);
    const hasDuplicates = new Set(selectedKeys).size !== selectedKeys.length;

    // Minimum yang wajib dipilih: jika peserta >= 3, posisi 1, 2, dan 3 wajib diisi. Posisi 4 opsional.
    const minRequiredCount = Math.min(3, Math.max(1, championship.participant_count || 3));
    const requiredRanksFilled = form.data.champions
        .filter((c) => c.rank <= minRequiredCount)
        .every((c) => Boolean(c.participant_key));

    const isComplete = !hasDuplicates && requiredRanksFilled && filledChampions.length >= minRequiredCount;

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
        form.transform((data) => ({
            ...data,
            champions: data.champions.filter((c) => Boolean(c.participant_key)),
        })).put(`/admin/panitera/scoring/champions/${championship.id}`, {
            preserveScroll: true,
            onSuccess: () => setConfirmation(null),
        });
    };

    return (
        <>
            <section id="champion-editor" className="scroll-mt-4 overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm space-y-0">
                {/* Header Nomor Pertandingan (Fokus 1 Nomor) */}
                <div className="border-b border-[#e8dfd2] bg-[linear-gradient(135deg,#17120f,#33261f)] p-4 text-white sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={championship.type === 'embu' ? 'blue' : 'red'}>{championship.type.toUpperCase()}</Badge>
                                <ClassificationBadge isExhibition={championship.is_exhibition} participantCount={championship.participant_count} hasDrawing={championship.has_drawing} />
                                {championship.format && (
                                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/80">
                                        {championship.format?.replaceAll('_', ' ').toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <h2 className="mt-3 text-xl font-black sm:text-2xl">{championship.name}</h2>
                            <p className="mt-1 text-xs text-white/65">
                                {championship.format?.replaceAll('_', ' ') || 'Format belum tersedia'} · {championship.current_champions.length ? 'Hasil juara resmi telah tersimpan di sistem' : 'Belum ada hasil juara tersimpan'}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={championship.current_champions.length ? 'green' : 'yellow'} className="w-fit">
                                <i className={`fa-solid ${championship.current_champions.length ? 'fa-circle-check' : 'fa-clock'} mr-1.5`} />
                                {championship.current_champions.length ? 'Sudah Dikonfirmasi' : 'Belum Dikonfirmasi'}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="space-y-5 p-4 sm:p-6">
                    {/* BAGIAN 1: HASIL JUARA RESMI JIKA SUDAH TERSIMPAN */}
                    {championship.current_champions.length > 0 && (
                        <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-yellow-50/50 to-white p-4 sm:p-5 shadow-xs space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-amber-200/70 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-xs">
                                        <i className="fa-solid fa-trophy" />
                                    </span>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                                            Juara Resmi Telah Ditetapkan
                                            <Badge variant="green" size="xs">Resmi</Badge>
                                        </h3>
                                        <p className="text-xs text-slate-600">
                                            Berikut susunan pemenang medali resmi untuk nomor {championship.name}.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {canManage && championship.generation.ready && (
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            onClick={() => setConfirmation('generate')}
                                            disabled={generating}
                                            className="border-amber-300 text-amber-900 hover:bg-amber-100"
                                            iconLeft={<i className="fa-solid fa-arrows-rotate" />}
                                        >
                                            Generate Ulang dari Hasil
                                        </Button>
                                    )}
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        onClick={() => setIsManualExpanded(!isManualExpanded)}
                                        iconLeft={<i className={`fa-solid ${isManualExpanded ? 'fa-chevron-up' : 'fa-pen-to-square'}`} />}
                                    >
                                        {isManualExpanded ? 'Tutup Koreksi Manual' : 'Koreksi Susunan Manual'}
                                    </Button>
                                </div>
                            </div>

                            <ChampionMedalsList champions={championship.current_champions} />
                        </div>
                    )}

                    {/* BAGIAN 2: JIKA BELUM DIKONFIRMASI TAPI SUDAH SIAP GENERATE */}
                    {championship.current_champions.length === 0 && championship.generation.ready && (
                        <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 p-4 sm:p-5 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-start sm:items-center gap-3">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-black text-lg shadow-sm">
                                        <i className="fa-solid fa-crown" />
                                    </span>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                                            Seluruh Pertandingan Selesai — Siap Generate Hasil Juara!
                                        </h3>
                                        <p className="text-xs text-slate-700 mt-0.5">
                                            {championship.generation.message || 'Seluruh partai telah tuntas. Klik tombol di samping untuk mengunci susunan juara.'}
                                        </p>
                                    </div>
                                </div>
                                {canManage && (
                                    <Button
                                        variant="gold"
                                        size="md"
                                        onClick={() => setConfirmation('generate')}
                                        disabled={generating}
                                        className="shrink-0 shadow-sm font-black"
                                        iconLeft={<i className="fa-solid fa-crown" />}
                                    >
                                        {generating ? 'Men-generate Juara...' : 'Generate Hasil Juara'}
                                    </Button>
                                )}
                            </div>

                            {championship.generation.champions.length > 0 && (
                                <div className="pt-3 border-t border-amber-300/60">
                                    <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-2">
                                        Kandidat Pemenang Medali dari Hasil Pertandingan:
                                    </p>
                                    <ChampionMedalsList champions={championship.generation.champions} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* BAGIAN 3: STATUS JIKA PERTANDINGAN BELUM SELESAI */}
                    {!championship.generation.ready && championship.current_champions.length === 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                            <p className="font-black flex items-center gap-2 text-sm">
                                <i className="fa-solid fa-triangle-exclamation text-amber-600" />
                                Pertandingan Belum Selesai
                            </p>
                            <p className="mt-1 text-slate-700">{championship.generation.message}</p>
                        </div>
                    )}

                    {/* BAGIAN 4: PANEL KOREKSI / PENYESUAIAN MANUAL (BISA DITUTUP/DIBUKA) */}
                    {isManualExpanded && (
                        <div className="rounded-2xl border border-[#e5ded4] bg-[#fbfaf8] p-4 sm:p-5 space-y-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#ede7df] pb-3">
                                <div>
                                    <h3 className="font-black text-[#17120f] flex items-center gap-2">
                                        <i className="fa-solid fa-sliders text-[#9a6b20]" />
                                        Penyesuaian Manual Susunan Juara
                                    </h3>
                                    <p className="mt-1 text-xs leading-5 text-[#7a746e]">
                                        Pilih peserta secara manual. Posisi ke-4 (Juara 3 Bersama / Juara 4) bersifat opsional dan dapat dikosongkan jika hanya ada 3 juara.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {slotCount >= 4 && (
                                        <div className="inline-flex rounded-lg border border-[#dcd4ca] bg-white p-0.5 text-[11px] font-bold shadow-2xs">
                                            <button
                                                type="button"
                                                onClick={() => setModeRank4('shared_bronze')}
                                                className={`rounded-md px-2.5 py-1 transition-all ${
                                                    modeRank4 === 'shared_bronze'
                                                        ? 'bg-[#17120f] text-white shadow-xs'
                                                        : 'text-[#7a746e] hover:text-[#17120f]'
                                                }`}
                                            >
                                                <i className="fa-solid fa-medal text-amber-500 mr-1" />
                                                Juara 3 Bersama
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setModeRank4('fourth_place')}
                                                className={`rounded-md px-2.5 py-1 transition-all ${
                                                    modeRank4 === 'fourth_place'
                                                        ? 'bg-[#17120f] text-white shadow-xs'
                                                        : 'text-[#7a746e] hover:text-[#17120f]'
                                                }`}
                                            >
                                                <i className="fa-solid fa-award text-blue-500 mr-1" />
                                                Juara 3 & Juara 4
                                            </button>
                                        </div>
                                    )}
                                    <span className="text-[10px] font-bold uppercase text-[#9a6b20] bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                                        {slotCount >= 4
                                            ? (filledChampions.length >= 4 ? '4 Juara Dipilih' : '3 Juara Dipilih (Slot 4 Kosong)')
                                            : `${championship.required_champion_count} posisi juara`}
                                    </span>
                                </div>
                            </div>

                            {(form.errors.champions || errors.category) && (
                                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                                    {form.errors.champions || errors.category}
                                </p>
                            )}

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {form.data.champions.map((champion) => {
                                    const info = getRankInfo(champion.rank, filledChampions.length, modeRank4);
                                    const isOptional = champion.rank === 4;
                                    const cardLabel = isOptional
                                        ? (modeRank4 === 'shared_bronze' ? 'Juara 3 Bersama' : 'Juara 4')
                                        : info.label;

                                    return (
                                        <div key={champion.rank} className={`rounded-xl border p-3 ${info.color}`}>
                                            <div className="mb-2 flex items-center justify-between gap-1">
                                                <p className="text-xs font-black uppercase flex items-center gap-1.5">
                                                    <i className={`fa-solid ${info.icon}`} aria-hidden="true" />
                                                    {cardLabel} · {info.medal}
                                                </p>
                                                {isOptional && (
                                                    <span className="rounded bg-orange-200/80 px-1.5 py-0.5 text-[9px] font-black uppercase text-orange-950">
                                                        Opsional
                                                    </span>
                                                )}
                                            </div>
                                            <Combobox
                                                ariaLabel={`Pilih peserta ${cardLabel}`}
                                                value={champion.participant_key}
                                                options={optionsForRank(champion.rank)}
                                                onChange={(value) => updateParticipant(champion.rank, value)}
                                                placeholder={isOptional ? `Pilih peserta ${cardLabel} (bisa dikosongkan)` : 'Pilih peserta'}
                                                searchPlaceholder="Cari atlet atau kontingen..."
                                                clearable
                                                disabled={!canManage || form.processing || generating}
                                                error={form.errors[`champions.${champion.rank - 1}.participant_key`]}
                                            />
                                            {isOptional && (
                                                <p className="mt-1.5 text-[10px] text-slate-500 leading-tight">
                                                    Bisa dikosongkan jika nomor ini hanya menetapkan Juara 1, 2, dan 3.
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-[#eee8e0] pt-4 sm:flex-row sm:justify-end">
                                <Button
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    disabled={!canManage || !championship.generation.ready || generating || form.processing}
                                    loading={generating}
                                    onClick={() => setConfirmation('generate')}
                                    iconLeft={<i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />}
                                >
                                    Generate Otomatis dari Hasil
                                </Button>
                                <Button
                                    variant="gold"
                                    className="w-full sm:w-auto font-black"
                                    disabled={!canManage || !isComplete || generating}
                                    loading={form.processing}
                                    onClick={() => setConfirmation('save')}
                                    iconLeft={<i className="fa-solid fa-floppy-disk" aria-hidden="true" />}
                                >
                                    Simpan Penyesuaian Juara
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* BAGIAN 5: DETAIL PERTANDINGAN (BAGAN RANDORI ATAU KLASEMEN EMBU) */}
                    <div className="border-t border-[#ede7df] pt-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    {championship.type === 'randori' ? (
                                        <>
                                            <i className="fa-solid fa-diagram-project text-rose-600" />
                                            <span>Bagan & Perjalanan Pertandingan Randori</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-ranking-star text-blue-600" />
                                            <span>Rekapitulasi Penilaian & Klasemen Embu</span>
                                        </>
                                    )}
                                </h3>
                                <p className="mt-0.5 text-xs text-slate-600">
                                    {championship.type === 'randori'
                                        ? 'Perjalanan eliminasi ganda (Upper & Lower Bracket) atau setengah kompetisi (Round Robin) hingga partai puncak.'
                                        : 'Hasil nilai 5 wasit juri, denda waktu, dan skor akhir babak penyisihan serta final.'}
                                </p>
                            </div>
                            <span className="self-start sm:self-auto rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                                {championship.type === 'randori' ? `${matches.length} Total Partai` : 'Klasemen Nilai'}
                            </span>
                        </div>

                        {championship.type === 'randori' ? (
                            matches.length > 0 ? (
                                <RandoriBracketTree
                                    matches={matches}
                                    activeEvent={activeEvent}
                                    categoryName={championship.name}
                                    categoryFormat={championship.format}
                                    canManage={false}
                                />
                            ) : (
                                <div className="rounded-xl border border-dashed border-[#dcd4ca] bg-[#faf8f5] p-8 text-center text-xs text-[#746c64]">
                                    <i className="fa-solid fa-diagram-project mb-2 text-2xl text-[#b5afa6]" />
                                    <p className="font-semibold">Bagan Pertandingan Belum Dibuat</p>
                                    <p className="mt-1 text-slate-500">Jalankan drawing pertandingan terlebih dahulu untuk membentuk bagan.</p>
                                </div>
                            )
                        ) : (
                            <EmbuRankingsView embuData={embuData} categoryName={championship.name} />
                        )}
                    </div>
                </div>
            </section>

            <AlertConfirm
                isOpen={confirmation === 'generate'}
                title="Generate hasil juara otomatis?"
                message="Susunan juara yang tersimpan pada nomor pertandingan ini akan diganti dengan hasil otomatis terbaru dari klasemen atau bagan pertandingan."
                confirmText="Generate & Simpan"
                cancelText="Batal"
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
                cancelText="Batal"
                variant="warning"
                isLoading={form.processing}
                error={form.errors.champions || ''}
                onCancel={() => setConfirmation(null)}
                onConfirm={saveChampions}
            />
        </>
    );
}

// Mode Tampilan Daftar Seluruh Nomor (1 per 1 Memanjang, BUKAN 2-2)
function CategoryListStacked({ activeEvent, categories, selectedCategory, canManage, errors, onSelect }) {
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
            <section className="space-y-4" aria-labelledby="all-categories-title">
                {categories.length > 0 ? (
                    categories.map((category, index) => {
                        const isSelected = category.id === selectedCategory;
                        const status = category.is_confirmed
                            ? { label: 'Sudah dikonfirmasi', variant: 'green', icon: 'fa-circle-check' }
                            : category.generation_ready
                                ? { label: 'Siap generate', variant: 'blue', icon: 'fa-wand-magic-sparkles' }
                                : { label: 'Menunggu hasil', variant: 'yellow', icon: 'fa-clock' };

                        return (
                            <article
                                key={category.id}
                                className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
                                    isSelected
                                        ? 'border-[#d4a843] bg-[#fffaf0] ring-2 ring-[#d4a843]/20 shadow-md'
                                        : 'border-[#e5ded4] bg-white hover:border-slate-400'
                                }`}
                            >
                                {/* Header Baris Nomor Pertandingan */}
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-[#f0eae1] pb-3">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-black text-white">
                                                #{index + 1}
                                            </span>
                                            <h3 className="text-base font-black text-slate-900">{category.name}</h3>
                                            <Badge variant={category.type === 'embu' ? 'blue' : 'red'} size="xs">{category.type.toUpperCase()}</Badge>
                                            <ClassificationBadge isExhibition={category.is_exhibition} participantCount={category.participant_count} hasDrawing={category.has_drawing} />
                                            <Badge variant={status.variant} size="xs">
                                                <i className={`fa-solid ${status.icon} mr-1`} />
                                                {status.label}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {category.format?.replaceAll('_', ' ').toUpperCase() || 'BAGAN'} · {category.participant_count} Peserta · Kuota {category.participant_count >= 3 ? '3–4' : category.required_champion_count} Posisi Juara
                                        </p>
                                    </div>

                                    {/* Tombol Aksi */}
                                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
                                        <Button
                                            size="sm"
                                            variant={isSelected ? 'primary' : 'outline'}
                                            iconLeft={<i className="fa-solid fa-eye" />}
                                            onClick={() => onSelect(category.id)}
                                        >
                                            {isSelected ? 'Sedang Dibuka' : 'Buka 1 Nomor'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="gold"
                                            disabled={!canManage || !category.generation_ready || generatingId !== null}
                                            loading={generatingId === category.id}
                                            iconLeft={<i className="fa-solid fa-crown" />}
                                            onClick={() => setGenerateTarget(category)}
                                        >
                                            {category.is_confirmed ? 'Generate Ulang' : 'Generate Juara'}
                                        </Button>
                                    </div>
                                </div>

                                {/* HASIL JUARA LANGSUNG KELIHATAN PADA SETIAP NOMOR */}
                                <div className="mt-3">
                                    {category.is_confirmed && category.saved_champions?.length > 0 ? (
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                                                <i className="fa-solid fa-trophy mr-1 text-amber-600" />
                                                Pemenang Medali Resmi:
                                            </p>
                                            <ChampionMedalsList champions={category.saved_champions} />
                                        </div>
                                    ) : category.generation_ready && category.generation_candidates?.length > 0 ? (
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-blue-800">
                                                <i className="fa-solid fa-wand-magic-sparkles mr-1 text-blue-600" />
                                                Kandidat Juara (Siap Generate):
                                            </p>
                                            <ChampionMedalsList champions={category.generation_candidates} />
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-900 flex items-center gap-2">
                                            <i className="fa-solid fa-clock text-amber-600 shrink-0" />
                                            <span>{category.generation_message || 'Pertandingan masih berjalan.'}</span>
                                        </div>
                                    )}
                                </div>
                            </article>
                        );
                    })
                ) : (
                    <div className="rounded-2xl border border-dashed border-[#d9d3c9] bg-white p-12 text-center text-sm text-[#7a746e]">
                        Tidak ada nomor pertandingan yang sesuai dengan filter yang dipilih.
                    </div>
                )}
            </section>

            <AlertConfirm
                isOpen={Boolean(generateTarget)}
                title={`Generate juara ${generateTarget?.name || ''}?`}
                message={generateTarget?.type === 'embu'
                    ? 'Sistem akan menyimpan peringkat dari akumulasi Penyisihan + Final serta aturan tie-break Juri 1. Hasil lama kategori ini akan diganti.'
                    : 'Sistem akan menyimpan Juara 1–4 dari hasil akhir bagan Randori. Hasil lama kategori ini akan diganti.'}
                confirmText="Generate & Simpan Juara"
                cancelText="Batal"
                variant="warning"
                isLoading={generatingId !== null}
                error={errors.category || ''}
                onCancel={() => setGenerateTarget(null)}
                onConfirm={generateChampions}
            />
        </>
    );
}

export default function ChampionResults({
    activeEvent,
    events = [],
    categories = [],
    selectedCategory,
    championship,
    matches = [],
    embuData = null,
    filters = {},
    summary = {},
    canManage = false,
}) {
    const { flash = {}, errors = {} } = usePage().props;
    const [typeFilter, setTypeFilter] = useState(filters.type || 'all'); // 'all' | 'randori' | 'embu'
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'confirmed' | 'ready' | 'pending'
    const [viewMode, setViewMode] = useState('single'); // 'single' (1 per 1 fokus) | 'list' (semua nomor 1 per 1 memanjang)

    // Filter categories sesuai tab Randori / Embu & status
    const filteredCategories = useMemo(() => {
        return categories.filter((cat) => {
            if (typeFilter !== 'all' && cat.type !== typeFilter) return false;
            if (statusFilter === 'confirmed' && !cat.is_confirmed) return false;
            if (statusFilter === 'ready' && (!cat.generation_ready || cat.is_confirmed)) return false;
            if (statusFilter === 'pending' && (cat.is_confirmed || cat.generation_ready)) return false;
            return true;
        });
    }, [categories, typeFilter, statusFilter]);

    // Opsi combobox untuk memilih nomor pertandingan
    const categoryOptions = useMemo(() => {
        return filteredCategories.map((c) => ({
            value: c.id,
            label: c.name,
            sublabel: `${c.type.toUpperCase()} · ${c.participant_count} Peserta · ${c.is_confirmed ? '✓ Dikonfirmasi' : c.generation_ready ? '⚡ Siap Generate' : 'Menunggu'}`,
        }));
    }, [filteredCategories]);

    const changeCategory = (value) => {
        router.get('/admin/panitera/scoring/champions', {
            event_id: activeEvent.id,
            category: value,
            type: typeFilter,
        }, {
            preserveState: false,
            preserveScroll: true,
        });
    };

    // Navigasi nomor sebelumnya & berikutnya
    const currentCategoryIndex = filteredCategories.findIndex((c) => c.id === selectedCategory);
    const hasPrev = currentCategoryIndex > 0;
    const hasNext = currentCategoryIndex >= 0 && currentCategoryIndex < filteredCategories.length - 1;

    const goToPrevCategory = () => {
        if (hasPrev) {
            changeCategory(filteredCategories[currentCategoryIndex - 1].id);
        }
    };

    const goToNextCategory = () => {
        if (hasNext) {
            changeCategory(filteredCategories[currentCategoryIndex + 1].id);
        }
    };

    const randoriCount = categories.filter((c) => c.type === 'randori').length;
    const embuCount = categories.filter((c) => c.type === 'embu').length;

    return (
        <AdminLayout title="Hasil Juara">
            <Head title="Hasil Juara | Smart Perkemi" />
            <div className="space-y-5">
                <PaniteraHeader
                    title="Hasil Juara per Nomor Pertandingan"
                    description="Pantau dan tetapkan pemenang medali per nomor pertandingan secara berurutan dan tertib."
                    activeEvent={activeEvent}
                    events={events}
                    path="/admin/panitera/scoring/champions"
                    icon="fa-trophy"
                />
                <FlashMessage flash={flash} errors={errors} />

                {/* Ringkasan Statistik */}
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Ringkasan hasil juara">
                    {[
                        ['total_categories', 'Total Nomor', 'fa-list-ol', 'bg-slate-100 text-slate-700'],
                        ['ready_categories', 'Siap Generate', 'fa-wand-magic-sparkles', 'bg-blue-100 text-blue-700'],
                        ['confirmed_categories', 'Sudah Dikonfirmasi', 'fa-circle-check', 'bg-emerald-100 text-emerald-700'],
                        ['exhibition_categories', 'Ekshibisi', 'fa-star', 'bg-amber-100 text-amber-800'],
                        ['non_exhibition_categories', 'Non-ekshibisi', 'fa-trophy', 'bg-emerald-100 text-emerald-700'],
                    ].map(([key, label, icon, color]) => (
                        <article key={key} className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[10px] font-black uppercase tracking-wide text-[#7a746e]">{label}</p>
                                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                                    <i className={`fa-solid ${icon}`} aria-hidden="true" />
                                </span>
                            </div>
                            <p className="mt-3 text-3xl font-black text-[#17120f]">{summary[key] || 0}</p>
                        </article>
                    ))}
                </section>

                {/* FILTER CARD UTAMA: Jenis (Semua / Randori / Embu), Dropdown Nomor Pertandingan, & Mode Tampilan */}
                <section className="rounded-2xl border border-[#e5ded4] bg-white p-4 sm:p-5 shadow-sm space-y-4">
                    {/* Baris 1: Filter Jenis Randori vs Embu */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#f0eae1] pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-600 mr-1">Jenis Pertandingan:</span>
                            <div className="inline-flex rounded-xl bg-[#f5f1eb] p-1 border border-[#e5ded4]">
                                <button
                                    type="button"
                                    onClick={() => setTypeFilter('all')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                        typeFilter === 'all'
                                            ? 'bg-slate-900 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Semua ({categories.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTypeFilter('randori')}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                        typeFilter === 'randori'
                                            ? 'bg-rose-600 text-white shadow-xs'
                                            : 'text-rose-700 hover:text-rose-900'
                                    }`}
                                >
                                    <span>⚔️ Randori</span>
                                    <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
                                        {randoriCount}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTypeFilter('embu')}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                        typeFilter === 'embu'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-blue-700 hover:text-blue-900'
                                    }`}
                                >
                                    <span>🥋 Embu</span>
                                    <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
                                        {embuCount}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Mode Switcher: Fokus 1 Nomor vs Daftar 1 per 1 */}
                        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 self-start sm:self-center">
                            <button
                                type="button"
                                onClick={() => setViewMode('single')}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                    viewMode === 'single'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <i className="fa-solid fa-square-check text-xs" />
                                <span>Fokus 1 Nomor</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                    viewMode === 'list'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <i className="fa-solid fa-list-ul text-xs" />
                                <span>Daftar Semua (1 per 1)</span>
                            </button>
                        </div>
                    </div>

                    {/* Baris 2: Dropdown Pilihan Nomor Pertandingan & Navigasi */}
                    <div className="grid gap-3 md:grid-cols-12 items-end">
                        <div className="md:col-span-8">
                            <Combobox
                                label="Pilih Nomor Pertandingan"
                                value={selectedCategory || ''}
                                onChange={changeCategory}
                                clearable={false}
                                options={categoryOptions}
                                placeholder="Pilih nomor pertandingan..."
                                searchPlaceholder="Cari nama nomor pertandingan..."
                            />
                        </div>
                        <div className="md:col-span-4 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={goToPrevCategory}
                                disabled={!hasPrev}
                                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all shadow-2xs min-h-10 ${
                                    hasPrev
                                        ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                                        : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                                title="Nomor Sebelumnya"
                            >
                                <i className="fa-solid fa-chevron-left text-[11px]" />
                                <span>Sebelumnya</span>
                            </button>
                            <button
                                type="button"
                                onClick={goToNextCategory}
                                disabled={!hasNext}
                                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all shadow-2xs min-h-10 ${
                                    hasNext
                                        ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                                        : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                                title="Nomor Berikutnya"
                            >
                                <span>Berikutnya</span>
                                <i className="fa-solid fa-chevron-right text-[11px]" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* KONTEN UTAMA: BERDASARKAN MODE TAMPILAN */}
                {viewMode === 'single' ? (
                    /* ══════════════════════════════════════════════════════════
                       MODE 1: FOKUS 1 NOMOR PERTANDINGAN (1 PER 1)
                       ══════════════════════════════════════════════════════════ */
                    championship ? (
                        <ChampionEditor
                            key={`${championship.id}-${championship.current_champions.map((c) => c.id).join('-') || 'draft'}`}
                            activeEvent={activeEvent}
                            championship={championship}
                            canManage={canManage}
                            matches={matches}
                            embuData={embuData}
                        />
                    ) : (
                        <div className="rounded-2xl border border-dashed border-[#d9d3c9] bg-white p-12 text-center text-sm text-[#7a746e]">
                            Pilih nomor pertandingan dari dropdown di atas untuk melihat dan mengelola susunan juara.
                        </div>
                    )
                ) : (
                    /* ══════════════════════════════════════════════════════════
                       MODE 2: DAFTAR SEMUA NOMOR (1 PER 1 MEMANJANG, BUKAN 2-2)
                       ══════════════════════════════════════════════════════════ */
                    <CategoryListStacked
                        activeEvent={activeEvent}
                        categories={filteredCategories}
                        selectedCategory={selectedCategory}
                        canManage={canManage}
                        errors={errors}
                        onSelect={(id) => {
                            changeCategory(id);
                            setViewMode('single');
                        }}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
