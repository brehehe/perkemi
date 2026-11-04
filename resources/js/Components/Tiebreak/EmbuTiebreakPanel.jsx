import { router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import Badge from '@/Components/UI/Elements/Badge';
import Button from '@/Components/UI/Elements/Button';

function getPosLabel(rankNum) {
    switch (Number(rankNum)) {
        case 1: return 'Posisi Pertama';
        case 2: return 'Posisi Kedua';
        case 3: return 'Posisi Ketiga';
        case 4: return 'Posisi Keempat';
        case 5: return 'Posisi Kelima';
        case 6: return 'Posisi Keenam';
        case 7: return 'Posisi Ketujuh';
        case 8: return 'Posisi Kedelapan';
        default: return `Posisi Ke-${rankNum}`;
    }
}

function TieGroupCard({ group, isArbitration = true }) {
    // group: { category_id, event_id, category_name, phase, pool, title, is_requested, requested_at, matches: [...] }
    const matches = group.matches || [];
    const matchIds = matches.map((m) => m.id);

    // Hitung hanya peringkat yang diperebutkan (Contested Ranks).
    // Contoh: jika kontingen #2 dan #3 seri, opsi hanya [#2, #3]. Peringkat #1 tidak muncul karena aman.
    const contestedRanks = (() => {
        const rawRanks = matches
            .map((m) => Number(m.rank))
            .filter((r) => !isNaN(r) && r > 0);

        if (rawRanks.length === matches.length) {
            const unique = Array.from(new Set(rawRanks)).sort((a, b) => a - b);
            if (unique.length === matches.length) {
                return unique;
            }
        }
        const minRank = rawRanks.length > 0 ? Math.min(...rawRanks) : 1;
        return matches.map((_, idx) => minRank + idx);
    })();

    // Inisialisasi pemetaan peringkat unik tanpa duplikat
    const computeInitialRanks = () => {
        const initial = {};
        const usedRanks = new Set();

        // 1. Prioritaskan manual_rank yang valid dan belum terpakai
        matches.forEach((m) => {
            const mRank = Number(m.manual_rank);
            if (mRank && contestedRanks.includes(mRank) && !usedRanks.has(mRank)) {
                initial[m.id] = mRank;
                usedRanks.add(mRank);
            }
        });

        // 2. Berikan rank bawaan match jika ada di contestedRanks dan belum terpakai
        matches.forEach((m) => {
            if (!initial[m.id]) {
                const r = Number(m.rank);
                if (r && contestedRanks.includes(r) && !usedRanks.has(r)) {
                    initial[m.id] = r;
                    usedRanks.add(r);
                }
            }
        });

        // 3. Fallback: ambil slot peringkat pertama yang masih kosong
        matches.forEach((m, idx) => {
            if (!initial[m.id]) {
                const freeRank = contestedRanks.find((r) => !usedRanks.has(r)) ?? contestedRanks[idx] ?? (idx + 1);
                initial[m.id] = freeRank;
                usedRanks.add(freeRank);
            }
        });

        return initial;
    };

    const [selectedRanks, setSelectedRanks] = useState(computeInitialRanks);
    const [submitting, setSubmitting] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [showDirectDecision, setShowDirectDecision] = useState(isArbitration);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        setSelectedRanks(computeInitialRanks());
    }, [group]);

    // AUTO-SWAP OTOMATIS & REVERSIBEL:
    // Ketika kontingen diubah ke peringkat X, kontingen yang sebelumnya memegang peringkat X
    // otomatis bertukar ke peringkat lama kontingen ini.
    const handleRankChange = (changedMatchId, newRankValue) => {
        const newRank = Number(newRankValue);
        setSelectedRanks((prev) => {
            const oldRank = prev[changedMatchId];
            if (oldRank === newRank) return prev;

            const next = { ...prev, [changedMatchId]: newRank };

            // Cari match lain yang sebelumnya menempati newRank dan tukar
            const matchToSwap = Object.keys(prev).find(
                (id) => id !== changedMatchId && prev[id] === newRank
            );

            if (matchToSwap && oldRank !== undefined) {
                next[matchToSwap] = oldRank;
            }

            return next;
        });
        setErrorMsg('');
    };

    const handleToggleRequest = (action = 'request') => {
        setRequesting(true);
        router.post(
            `/admin/panitera/scoring/embu-result/${group.category_id}/request-tiebreak`,
            {
                match_ids: matchIds,
                action,
                event_id: group.event_id,
            },
            {
                preserveScroll: true,
                onFinish: () => setRequesting(false),
            }
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Check for duplicates
        const rankValues = Object.values(selectedRanks);
        const uniqueValues = new Set(rankValues);
        if (uniqueValues.size !== rankValues.length) {
            setErrorMsg('Setiap peserta dalam grup seri harus mendapatkan peringkat yang berbeda (tidak boleh sama).');
            return;
        }

        setSubmitting(true);
        const url = isArbitration
            ? `/admin/arbitrase/scoring/embu-tiebreak/${group.category_id}`
            : `/admin/panitera/scoring/embu-result/${group.category_id}/resolve-tiebreak-ranks`;

        router.post(
            url,
            {
                ranks: selectedRanks,
                event_id: group.event_id,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setErrorMsg('');
                },
                onFinish: () => {
                    setSubmitting(false);
                },
            }
        );
    };

    return (
        <div className="rounded-xl border border-amber-300/80 bg-white p-4 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-amber-200/60 pb-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-black px-2 py-0.5 text-xs shadow-2xs">
                            <i className="fa-solid fa-scale-balanced mr-1" />
                            {group.phase === 'final' ? 'Babak Final' : `Penyisihan · Pool ${group.pool || 'A'}`}
                        </span>
                        {(group.court_name || group.matches?.[0]?.court_name) && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-100 text-blue-950 border border-blue-300 font-bold px-2 py-0.5 text-xs shadow-2xs">
                                <i className="fa-solid fa-location-dot text-[10px] text-blue-700" />
                                {group.court_name || group.matches[0].court_name}
                            </span>
                        )}
                        <h4 className="font-bold text-slate-900 text-sm">
                            {group.title || group.category_name}
                        </h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {group.category_name} · 4 Parameter sebelumnya bernilai seri mutlak.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {group.is_requested ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 text-[11px] font-bold">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            Menunggu Wasit Utama
                        </span>
                    ) : (
                        <Badge variant="yellow" size="sm">
                            Parameter 5: Penentuan Wasit Utama
                        </Badge>
                    )}
                </div>
            </div>

            {/* JIKA DIAKSES DARI SISI PANITERA: CARD AKSI KIRIM KE WASIT UTAMA ATAU STATUS MENUNGGU */}
            {!isArbitration && (
                <div>
                    {group.is_requested ? (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 shadow-2xs">
                            <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black text-sm shadow-2xs">
                                    <i className="fa-solid fa-hourglass-half" />
                                </span>
                                <div>
                                    <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                        Kasus Telah Dikirim ke Meja Wasit Utama
                                    </p>
                                    <p className="text-[11px] text-amber-800 mt-0.5">
                                        Form penentuan urutan peringkat saat ini sedang aktif di panel Wasit Utama. Menunggu Wasit Utama menetapkan urutan juara/lolos.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="xs"
                                    disabled={requesting}
                                    onClick={() => handleToggleRequest('cancel')}
                                    className="border-rose-300 text-rose-800 hover:bg-rose-50 hover:border-rose-400 font-bold"
                                    iconLeft={<i className="fa-solid fa-xmark text-rose-600" />}
                                >
                                    Tarik Permintaan
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="xs"
                                    onClick={() => setShowDirectDecision(!showDirectDecision)}
                                    className="text-slate-700 font-bold"
                                >
                                    {showDirectDecision ? 'Sembunyikan Form Manual' : 'Input Manual Panitera'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50/60 to-white p-3.5 shadow-2xs">
                            <div>
                                <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                    <i className="fa-solid fa-gavel text-amber-600" />
                                    Perlu Keputusan Wasit Utama (Parameter 5)
                                </p>
                                <p className="text-[11px] text-amber-800 mt-0.5">
                                    Klik tombol di samping untuk memunculkan form penetapan urutan ini secara eksklusif di panel Wasit Utama (Juri 1).
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                                <Button
                                    type="button"
                                    variant="gold"
                                    size="sm"
                                    disabled={requesting}
                                    loading={requesting}
                                    onClick={() => handleToggleRequest('request')}
                                    className="font-black shadow-xs shrink-0"
                                    iconLeft={<i className="fa-solid fa-paper-plane" />}
                                >
                                    Kirim ke Panel Wasit Utama
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="xs"
                                    onClick={() => setShowDirectDecision(!showDirectDecision)}
                                    className="text-slate-600 text-xs shrink-0"
                                >
                                    {showDirectDecision ? 'Batal' : 'Tetapkan di Sini'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* NOTIFIKASI ERROR JIKA ADA DUPLIKAT RANK */}
            {errorMsg && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-800 flex items-center gap-2">
                    <i className="fa-solid fa-circle-exclamation text-rose-600" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* FORM PENENTUAN URUTAN (MUNCUL OTOMATIS DI WASIT UTAMA ATAU KETIKA PANITERA MEMBUKA FORM MANUAL) */}
            {(isArbitration || showDirectDecision) && (
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {isArbitration && (
                        <div className="rounded-xl bg-gradient-to-r from-amber-50 via-yellow-50/70 to-amber-50 border-2 border-amber-300 p-4 text-amber-950 shadow-2xs space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-black text-xs shadow-2xs">
                                    <i className="fa-solid fa-gavel" />
                                </span>
                                <h5 className="font-black text-sm sm:text-base text-amber-950">
                                    Permintaan Keputusan Wasit Utama (Parameter 5)
                                </h5>
                            </div>
                            <p className="text-xs sm:text-sm text-amber-900 leading-relaxed pl-9">
                                Skor kontingen berikut bernilai sama persis (seri) pada 4 parameter teknis PB PERKEMI. Sesuai regulasi, <strong>Wasit Utama</strong> berhak menentukan posisi peringkat secara definitif.
                            </p>
                            <p className="text-[11px] sm:text-xs text-amber-800 font-semibold pl-9">
                                💡 <em>Petunjuk: Sentuh / pilih peringkat untuk tiap peserta, lalu tekan tombol <strong>Simpan Keputusan Urutan Peringkat</strong> di bawah.</em>
                            </p>
                        </div>
                    )}

                    {/* TAMPILAN MOBILE: KARTU RINGKAS DENGAN SELECT (RAMAH WASIT & TIDAK PANJANG) */}
                    <div className="block md:hidden space-y-3">
                        {matches.map((m, idx) => {
                            const currentRank = selectedRanks[m.id] ?? (idx + 1);
                            const totalScore = Number(m.param1_score ?? m.score ?? 0);
                            const techScore = Number(m.technique_score ?? m.param2_technique ?? m.middle_technique_sum ?? 0);
                            const exprScore = Number(m.expression_score ?? Math.max(0, totalScore - techScore));
                            const currentPosText = getPosLabel(currentRank);

                            return (
                                <div
                                    key={m.id}
                                    className="rounded-2xl border border-amber-300/80 bg-white p-3.5 shadow-xs space-y-3"
                                >
                                    {/* Header Peserta & Badge Peringkat */}
                                    <div className="flex items-start justify-between gap-2.5">
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-black text-slate-900 leading-snug break-words">
                                                {m.participant_label || m.label}
                                            </h4>
                                            {m.athlete_name && (
                                                <p className="text-xs font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                                                    <i className="fa-solid fa-user-ninja text-[10px] text-slate-500" />
                                                    {m.athlete_name}
                                                </p>
                                            )}
                                            {m.contingent_name && (
                                                <p className="text-xs font-medium text-slate-600 mt-0.5">
                                                    {m.contingent_name}
                                                </p>
                                            )}
                                        </div>
                                        <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-amber-500 text-slate-950 px-2 py-1 text-xs font-black shadow-2xs">
                                            #{currentRank}
                                        </span>
                                    </div>

                                    {/* 3 Nilai Inti: Total Nilai, Nilai Teknik, Nilai Ekspresi (Ringkas 3 Kolom) */}
                                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-amber-50/50 border border-amber-200/70 p-2.5 text-center">
                                        <div>
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-900">
                                                Total Nilai
                                            </span>
                                            <span className="font-mono text-base font-black text-amber-950">
                                                {totalScore.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="border-x border-amber-200/60">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                                Nilai Teknik
                                            </span>
                                            <span className="font-mono text-base font-black text-slate-900">
                                                {techScore.toFixed(2)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                                Nilai Ekspresi
                                            </span>
                                            <span className="font-mono text-base font-black text-slate-900">
                                                {exprScore.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Select Dropdown untuk Memilih Peringkat (Ramah Sentuhan, Otomatis Tukar) */}
                                    <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
                                        <label
                                            htmlFor={`rank-select-mobile-${m.id}`}
                                            className="text-xs font-bold text-slate-700 shrink-0"
                                        >
                                            Pilih Peringkat:
                                        </label>
                                        <div className="relative flex-1 max-w-[200px]">
                                            <select
                                                id={`rank-select-mobile-${m.id}`}
                                                value={currentRank}
                                                onChange={(e) => handleRankChange(m.id, e.target.value)}
                                                className="w-full rounded-xl border-2 border-amber-400 bg-white py-2 pl-3 pr-8 text-xs font-black text-slate-900 shadow-2xs focus:border-amber-600 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                                            >
                                                {contestedRanks.map((r) => {
                                                    const posLabel = getPosLabel(r);
                                                    return (
                                                        <option key={r} value={r}>
                                                            #{r} ({posLabel})
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* TAMPILAN DESKTOP: TABEL PERBANDINGAN BERDAMPINGAN (LAYAR LEBAR) */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-full text-left text-xs divide-y divide-slate-200">
                            <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-700">
                                <tr>
                                    <th className="px-3.5 py-3">Peserta / Kontingen</th>
                                    <th className="px-3.5 py-3 text-center">P1: Skor Akhir</th>
                                    <th className="px-3.5 py-3 text-center">P2: Teknik 3 Wasit</th>
                                    <th className="px-3.5 py-3 text-center">P3: W1 Total</th>
                                    <th className="px-3.5 py-3 text-center">P4: W1 Teknik</th>
                                    <th className="px-3.5 py-3 text-right">P5: Urutan Peringkat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {matches.map((m, idx) => {
                                    const currentRank = selectedRanks[m.id] ?? (idx + 1);
                                    const p1Score = Number(m.param1_score ?? m.score ?? 0);
                                    const p2Tech = Number(m.param2_technique ?? m.middle_technique_sum ?? 0);
                                    const p3ChiefTotal = Number(m.param3_chief_total ?? m.chief_judge_total ?? 0);
                                    const p4ChiefTech = Number(m.param4_chief_technique ?? m.chief_judge_technique ?? 0);

                                    return (
                                        <tr key={m.id} className="hover:bg-amber-50/30 transition-colors">
                                            <td className="px-3.5 py-3">
                                                <p className="font-bold text-slate-900 text-sm">{m.participant_label || m.label}</p>
                                                {m.athlete_name && (
                                                    <p className="text-xs font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                                                        <i className="fa-solid fa-user-ninja text-[10px] text-slate-500" />
                                                        {m.athlete_name}
                                                    </p>
                                                )}
                                                <p className="text-xs text-slate-500">{m.contingent_name || ''}</p>
                                            </td>
                                            <td className="px-3.5 py-3 text-center font-mono font-bold text-sm text-amber-900">
                                                {p1Score.toFixed(2)}
                                            </td>
                                            <td className="px-3.5 py-3 text-center font-mono text-sm text-slate-800">
                                                {p2Tech.toFixed(2)}
                                            </td>
                                            <td className="px-3.5 py-3 text-center font-mono text-sm text-slate-800">
                                                {p3ChiefTotal.toFixed(2)}
                                            </td>
                                            <td className="px-3.5 py-3 text-center font-mono text-sm text-slate-800">
                                                {p4ChiefTech.toFixed(2)}
                                            </td>
                                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center gap-2">
                                                    <label htmlFor={`rank-${m.id}`} className="text-xs font-bold text-slate-700">
                                                        Peringkat:
                                                    </label>
                                                    <select
                                                        id={`rank-${m.id}`}
                                                        value={currentRank}
                                                        onChange={(e) => handleRankChange(m.id, e.target.value)}
                                                        className="rounded-xl border-2 border-amber-300 bg-amber-50/70 text-xs sm:text-sm font-black text-slate-900 py-1.5 px-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 shadow-2xs"
                                                    >
                                                        {contestedRanks.map((r) => {
                                                            const posLabel = getPosLabel(r);
                                                            return (
                                                                <option key={r} value={r}>
                                                                    #{r} ({posLabel})
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-600 italic">
                            * Urutan peringkat yang dipilih akan langsung menentukan tiket lolos ke babak final atau pembagian medali juara.
                        </p>
                        <Button
                            type="submit"
                            variant="gold"
                            size="md"
                            loading={submitting}
                            disabled={submitting}
                            className="w-full sm:w-auto min-h-12 px-6 py-3 text-sm sm:text-base font-black rounded-xl shadow-md cursor-pointer shrink-0"
                            iconLeft={<i className="fa-solid fa-gavel text-base" />}
                        >
                            Simpan Keputusan Urutan Peringkat
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default function EmbuTiebreakPanel({ ties = [], isArbitration = true, className = '' }) {
    if (!ties || ties.length === 0) return null;

    return (
        <section className={`rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-black text-lg shadow-sm">
                        <i className="fa-solid fa-gavel" />
                    </span>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 text-base sm:text-lg">
                                Keputusan Penentuan Urutan Tie-Break (Parameter 5)
                            </h3>
                            <Badge variant="red" size="sm">
                                {ties.length} Kasus Perlu Penetapan
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-700 mt-1 max-w-2xl leading-relaxed">
                            Berdasarkan Regulasi PB PERKEMI, jika Nilai Akhir (P1), Nilai Teknik 3 Wasit (P2), Total Wasit Utama (P3), dan Nilai Teknik Wasit Utama (P4) identik, urutan posisi klasemen ditentukan secara definitif oleh Wasit Utama.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {ties.map((group, idx) => (
                    <TieGroupCard
                        key={group.id || `${group.category_id}-${group.phase}-${group.pool || ''}-${idx}-${group.matches?.map((m) => m.id).join('-')}`}
                        group={group}
                        isArbitration={isArbitration}
                    />
                ))}
            </div>
        </section>
    );
}
