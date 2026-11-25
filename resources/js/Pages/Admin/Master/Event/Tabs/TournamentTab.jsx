import React, { useEffect } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { Input, Button } from '@/Components/UI';

export default function TournamentTab({
    event,
    tournamentSummary = {
        status: 'draft',
        generated_categories: 0,
        skipped_categories: 0,
        total_matches: 0,
        match_sessions: 0,
    },
}) {
    const tournamentForm = useForm({
        match_duration_minutes: event.match_duration_minutes || 10,
        minimum_rest_minutes: event.minimum_rest_minutes || 15,
        minimum_entries_per_category: event.minimum_entries_per_category || 3,
        minimum_contingents_per_category: event.minimum_contingents_per_category || 3,
        tts_announcer_enabled: event.tts_announcer_enabled ?? true,
        champion_ranking_system: event.champion_ranking_system || 'medals',
        champion_gold_points: event.champion_gold_points || 5,
        champion_silver_points: event.champion_silver_points || 3,
        champion_bronze_points: event.champion_bronze_points || 1,
    });

    useEffect(() => {
        if (event.tts_announcer_enabled !== undefined) {
            tournamentForm.setData('tts_announcer_enabled', Boolean(event.tts_announcer_enabled));
        }
        if (event.champion_ranking_system) {
            tournamentForm.setData('champion_ranking_system', event.champion_ranking_system);
        }
        if (event.champion_gold_points) {
            tournamentForm.setData('champion_gold_points', event.champion_gold_points);
        }
        if (event.champion_silver_points) {
            tournamentForm.setData('champion_silver_points', event.champion_silver_points);
        }
        if (event.champion_bronze_points) {
            tournamentForm.setData('champion_bronze_points', event.champion_bronze_points);
        }
    }, [
        event.tts_announcer_enabled,
        event.champion_ranking_system,
        event.champion_gold_points,
        event.champion_silver_points,
        event.champion_bronze_points,
    ]);

    const submitTournamentSettings = (e) => {
        e.preventDefault();
        tournamentForm.put(`/admin/master/event/${event.id}/tournament-settings`, {
            preserveScroll: true,
        });
    };

    return (
        <div className="space-y-5">
            <section className="rounded-2xl border border-[#ede9e1] bg-white p-5 shadow-xs md:p-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#a47420] dark:text-[#f0c060]">Alur pertandingan event</p>
                        <h3 className="mt-1 font-sans text-lg font-bold text-[#17120f] dark:text-white">Pengaturan Drawing & Penjadwalan</h3>
                        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#8c827a] dark:text-slate-400">Nilai ini dipakai saat precheck, pembentukan pool/bracket, dan penempatan partai pada sesi pertandingan event ini.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/pertandingan/merge?event_id=${event.id}`} className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"><i className="fa-solid fa-object-group mr-1.5" />Merge Nomor</Link>
                        <Link href={`/admin/pertandingan/drawing?event_id=${event.id}`} className="rounded-xl bg-[#17120f] px-3.5 py-2 text-xs font-bold text-[#f0c060] hover:bg-black dark:bg-amber-500 dark:text-black dark:hover:bg-amber-400"><i className="fa-solid fa-wand-magic-sparkles mr-1.5" />Buka Drawing</Link>
                    </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        ['Status alur', tournamentSummary.status === 'completed' ? 'Selesai' : tournamentSummary.status === 'in_progress' ? 'Berlangsung' : tournamentSummary.status === 'published' ? 'Dipublikasikan' : tournamentSummary.status === 'generated' ? 'Sudah dibuat' : 'Draft', 'fa-flag'],
                        ['Kategori dibuat', tournamentSummary.generated_categories, 'fa-diagram-project'],
                        ['Perlu merge', tournamentSummary.skipped_categories, 'fa-object-group'],
                        ['Node / sesi tanding', `${tournamentSummary.total_matches} / ${tournamentSummary.match_sessions}`, 'fa-calendar-check'],
                    ].map(([label, value, icon]) => (
                        <div key={label} className="rounded-xl border border-[#eee8e0] bg-[#faf8f4] p-4 dark:border-slate-800 dark:bg-slate-950/40">
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-semibold text-[#746b63] dark:text-slate-400">{label}</p>
                                <i className={`fa-solid ${icon} text-[#c0392b] dark:text-rose-400`} />
                            </div>
                            <p className="mt-2 text-xl font-bold text-[#17120f] dark:text-white">{value}</p>
                        </div>
                    ))}
                </div>
            </section>

            <form onSubmit={submitTournamentSettings} className="overflow-hidden rounded-2xl border border-[#ede9e1] bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-3 border-b border-[#ede9e1] p-5 md:flex-row md:items-center md:justify-between md:px-6 dark:border-slate-800">
                    <div>
                        <h3 className="font-sans text-base font-bold uppercase text-[#17120f] dark:text-white">Aturan Generate Pertandingan</h3>
                        <p className="mt-1 text-xs text-[#8c827a] dark:text-slate-400">Berlaku hanya untuk event ini dan dapat diubah sebelum drawing dipublikasikan.</p>
                    </div>
                    <Button variant="unstyled" size="none" type="submit" disabled={tournamentForm.processing} className="rounded-xl bg-gradient-to-r from-[#c0392b] to-[#96281b] px-4 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"><i className={`fa-solid ${tournamentForm.processing ? 'fa-spinner animate-spin' : 'fa-check'} mr-1.5`} />{tournamentForm.processing ? 'Menyimpan...' : 'Simpan Pengaturan'}</Button>
                </div>
                <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6 xl:grid-cols-4">
                    <Input label="Durasi Satu Partai (menit)" type="number" min="1" required value={tournamentForm.data.match_duration_minutes} onChange={(e) => tournamentForm.setData('match_duration_minutes', e.target.value)} error={tournamentForm.errors.match_duration_minutes} />
                    <Input label="Jeda Minimal Atlet (menit)" type="number" min="0" required value={tournamentForm.data.minimum_rest_minutes} onChange={(e) => tournamentForm.setData('minimum_rest_minutes', e.target.value)} error={tournamentForm.errors.minimum_rest_minutes} />
                    <Input label="Minimal Peserta / Kategori" type="number" min="1" required value={tournamentForm.data.minimum_entries_per_category} onChange={(e) => tournamentForm.setData('minimum_entries_per_category', e.target.value)} error={tournamentForm.errors.minimum_entries_per_category} />
                    <Input label="Minimal Kontingen / Kategori" type="number" min="1" required value={tournamentForm.data.minimum_contingents_per_category} onChange={(e) => tournamentForm.setData('minimum_contingents_per_category', e.target.value)} error={tournamentForm.errors.minimum_contingents_per_category} />
                </div>

                {/* TTS Announcer Setting */}
                <div className="border-t border-[#ede9e1] p-5 md:px-6 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                                <i className="fa-solid fa-volume-high" />
                            </span>
                            <div>
                                <h4 className="text-sm font-bold text-[#141210] dark:text-white">Panggilan Suara Otomatis (TTS Announcer)</h4>
                                <p className="mt-0.5 text-xs text-[#706860] dark:text-slate-400">
                                    Aktifkan panggilan suara Text-to-Speech untuk pemanggilan atlet, status partai, dan pengumuman tatami secara otomatis.
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center shrink-0">
                            <input
                                type="checkbox"
                                checked={tournamentForm.data.tts_announcer_enabled}
                                onChange={(e) => tournamentForm.setData('tts_announcer_enabled', e.target.checked)}
                                className="peer sr-only"
                            />
                            <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-[#c0392b] peer-focus:outline-hidden dark:bg-slate-700 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                        </label>
                    </div>
                </div>

                {/* Champion Ranking System Setting */}
                <div className="border-t border-[#ede9e1] p-5 md:px-6 space-y-4 dark:border-slate-800">
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400">
                            <i className="fa-solid fa-trophy" />
                        </span>
                        <div>
                            <h4 className="text-sm font-bold text-[#141210] dark:text-white">Sistem Penentuan Juara Umum</h4>
                            <p className="mt-0.5 text-xs text-[#706860] dark:text-slate-400">
                                Tentukan metode perhitungan klasemen perolehan medali untuk menentukan Juara Umum kejuaraan.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <label
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                                tournamentForm.data.champion_ranking_system === 'medals'
                                    ? 'border-[#c0392b] bg-rose-50/50 shadow-xs dark:border-rose-500/50 dark:bg-rose-950/20'
                                    : 'border-[#ede9e1] bg-white hover:border-[#ded8ce] dark:border-slate-800 dark:bg-slate-900'
                            }`}
                        >
                            <input
                                type="radio"
                                name="champion_ranking_system"
                                value="medals"
                                checked={tournamentForm.data.champion_ranking_system === 'medals'}
                                onChange={() => tournamentForm.setData('champion_ranking_system', 'medals')}
                                className="mt-1 text-[#c0392b] focus:ring-[#c0392b]"
                            />
                            <div>
                                <p className="text-xs font-bold text-[#17120f] dark:text-white">Prioritas Medali (Standar Olimpiade)</p>
                                <p className="mt-1 text-[11px] leading-relaxed text-[#8c827a] dark:text-slate-400">
                                    Urutan: Emas terbanyak → Perak terbanyak → Perunggu terbanyak. Sistem standar PERKEMI nasional.
                                </p>
                            </div>
                        </label>

                        <label
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                                tournamentForm.data.champion_ranking_system === 'points'
                                    ? 'border-[#c0392b] bg-rose-50/50 shadow-xs dark:border-rose-500/50 dark:bg-rose-950/20'
                                    : 'border-[#ede9e1] bg-white hover:border-[#ded8ce] dark:border-slate-800 dark:bg-slate-900'
                            }`}
                        >
                            <input
                                type="radio"
                                name="champion_ranking_system"
                                value="points"
                                checked={tournamentForm.data.champion_ranking_system === 'points'}
                                onChange={() => tournamentForm.setData('champion_ranking_system', 'points')}
                                className="mt-1 text-[#c0392b] focus:ring-[#c0392b]"
                            />
                            <div>
                                <p className="text-xs font-bold text-[#17120f] dark:text-white">Akumulasi Bobot Poin</p>
                                <p className="mt-1 text-[11px] leading-relaxed text-[#8c827a] dark:text-slate-400">
                                    Setiap medali memiliki bobot poin kustom. Kontingen dengan total poin akumulasi tertinggi menjadi Juara Umum.
                                </p>
                            </div>
                        </label>
                    </div>

                    {tournamentForm.data.champion_ranking_system === 'points' && (
                        <div className="rounded-xl border border-amber-200 bg-[#fffdf9] p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                            <p className="text-xs font-bold text-[#17120f] mb-3 dark:text-white">Bobot Poin Per Medali:</p>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <Input
                                    label="Poin Medali Emas (Juara 1)"
                                    type="number"
                                    min="1"
                                    max="100"
                                    required
                                    value={tournamentForm.data.champion_gold_points}
                                    onChange={(e) => tournamentForm.setData('champion_gold_points', e.target.value)}
                                    error={tournamentForm.errors.champion_gold_points}
                                />
                                <Input
                                    label="Poin Medali Perak (Juara 2)"
                                    type="number"
                                    min="1"
                                    max="100"
                                    required
                                    value={tournamentForm.data.champion_silver_points}
                                    onChange={(e) => tournamentForm.setData('champion_silver_points', e.target.value)}
                                    error={tournamentForm.errors.champion_silver_points}
                                />
                                <Input
                                    label="Poin Medali Perunggu (Juara 3)"
                                    type="number"
                                    min="1"
                                    max="100"
                                    required
                                    value={tournamentForm.data.champion_bronze_points}
                                    onChange={(e) => tournamentForm.setData('champion_bronze_points', e.target.value)}
                                    error={tournamentForm.errors.champion_bronze_points}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid gap-3 border-t border-[#ede9e1] bg-[#faf8f4] p-5 text-xs text-[#5f574f] md:grid-cols-4 md:px-6 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
                    {[
                        ['1', 'Precheck', 'Registrasi dan pembayaran terverifikasi.'],
                        ['2', 'Drawing', 'Antar-kontingen diselingi, Embu dibuat pool, Randori dibuat bracket.'],
                        ['3', 'Jadwal', 'Penyisihan lebih dulu, final setelah jeda minimal.'],
                        ['4', 'Publikasi', 'Bagan dikunci setelah diperiksa admin event.'],
                    ].map(([number, title, description]) => (
                        <div key={number} className="flex gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#17120f] font-bold text-[#f0c060] dark:bg-amber-500 dark:text-black">
                                {number}
                            </span>
                            <div>
                                <p className="font-bold text-[#17120f] dark:text-white">{title}</p>
                                <p className="mt-0.5 leading-relaxed text-[#8c827a] dark:text-slate-400">{description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </form>
        </div>
    );
}
