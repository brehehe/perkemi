import Badge from '@/Components/UI/Elements/Badge';
import Button from '@/Components/UI/Elements/Button';
import Combobox from '@/Components/UI/Forms/Combobox';
import Input from '@/Components/UI/Forms/Input';
import Modal from '@/Components/UI/Overlays/Modal';
import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessage from './Partials/FlashMessage';
import CourtMonitorLinks from './Partials/CourtMonitorLinks';
import PaniteraHeader from './Partials/PaniteraHeader';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const formatScore = (value) => value === null || value === undefined ? '—' : Number(value).toFixed(2);

function JudgeScores({ score }) {
    if (!score) return <span className="text-[#9b9188]">Belum dinilai</span>;
    const usesTrimmedScore = score.judge_scores.length === 5;
    const minIndex = usesTrimmedScore ? score.judge_scores.indexOf(Math.min(...score.judge_scores)) : -1;
    const maxIndex = usesTrimmedScore ? score.judge_scores.lastIndexOf(Math.max(...score.judge_scores)) : -1;

    return (
        <div className="flex flex-wrap gap-1.5">
            {score.judge_scores.map((value, index) => (
                <span key={`${index}-${value}`} className={`rounded-md border px-2 py-1 font-mono ${index === minIndex || index === maxIndex ? 'border-rose-200 bg-rose-50 text-rose-500 line-through' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                    W{score.judge_numbers?.[index] || index + 1}: {formatScore(value)}
                </span>
            ))}
        </div>
    );
}

function RankingTable({ rows, quota = null, onScore, canManage, final = false }) {
    return (
        <TableContainer ariaLabel={final ? 'Klasemen final Embu' : 'Klasemen penyisihan Embu'}>
            <table className="responsive-data-table responsive-data-table--cards min-w-full text-left text-xs">
                <thead className="bg-[#f7f4ef] text-[10px] uppercase tracking-wide text-[#7a746e]">
                    <tr>
                        <th className="px-4 py-3">Peringkat</th><th className="px-4 py-3">Peserta / Kontingen</th><th className="px-4 py-3">Court & Jadwal</th><th className="px-4 py-3">Nilai Wasit</th><th className="px-4 py-3">Denda</th><th className="px-4 py-3">{final ? 'Akumulasi' : 'Nilai Akhir'}</th><th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#ede9e1]">
                    {rows.map((row, index) => {
                        const qualified = quota && quota !== 999 && index < quota;
                        return (
                            <tr key={row.match_id} className={qualified ? 'bg-emerald-50/40' : ''}>
                                <td data-label="Peringkat" className="whitespace-nowrap px-4 py-3"><span className="text-base font-black">#{index + 1}</span>{qualified && <Badge variant="green" size="sm" className="ml-2">Tiket Final</Badge>}</td>
                                <td data-label="Peserta / Kontingen" className="min-w-64 px-4 py-3"><p className="font-bold text-[#17120f]">{row.participant_label}</p><p className="mt-0.5 text-[#7a746e]">{row.metadata?.members?.join(', ') || row.metadata?.contingent_name || 'Data peserta'}</p></td>
                                <td data-label="Court & Jadwal" className="min-w-40 px-4 py-3"><p className="font-semibold text-[#17120f]">{row.court || 'Belum diplot'}</p><p className="mt-0.5 text-[#7a746e]">{row.scheduled_at || 'Belum dijadwalkan'}</p></td>
                                <td data-label="Nilai Wasit" className="min-w-80 px-4 py-3"><JudgeScores score={row.score} /></td>
                                <td data-label="Denda" className="whitespace-nowrap px-4 py-3 font-semibold text-rose-700">{row.score ? `-${formatScore(row.score.time_penalty)}` : '—'}</td>
                                <td data-label={final ? 'Akumulasi' : 'Nilai Akhir'} className="whitespace-nowrap px-4 py-3">
                                    {final ? (
                                        <div><p className="text-[11px] text-[#7a746e]">P {formatScore(row.preliminary_score)} + F {formatScore(row.final_round_score)}</p><p className="mt-0.5 text-lg font-black text-[#9a6b20]">{formatScore(row.total_score)}</p></div>
                                    ) : <span className="text-lg font-black text-[#9a6b20]">{formatScore(row.score?.final_score)}</span>}
                                </td>
                                <td data-label="Aksi" className="whitespace-nowrap px-4 py-3 text-right">{canManage && <Button size="xs" variant="outline" onClick={() => onScore(row)}>{row.score ? 'Ubah Nilai' : 'Input Nilai'}</Button>}</td>
                            </tr>
                        );
                    })}
                    {rows.length === 0 && <tr><td colSpan="7" className="px-4 py-10 text-center text-[#7a746e]">Belum ada peserta pada babak ini.</td></tr>}
                </tbody>
            </table>
        </TableContainer>
    );
}

export default function EmbuResult({ activeEvent, events = [], courts = [], categories = [], selectedCategory, focusMatchId = null, preliminaryRankings = {}, finalRankings = [], boundaryTies = [], quotaPerPool, hasTopFourTie = false, champions = [], canManage = false }) {
    const { flash = {}, errors = {} } = usePage().props;
    const [selectedMatch, setSelectedMatch] = useState(null);
    const focusHandled = useRef(false);
    const category = categories.find((item) => item.id === selectedCategory);
    const form = useForm({ event_id: activeEvent.id, judge_scores: ['', '', '', '', ''], duration_seconds: '', penalty_override: '', tiebreak_round: 0, notes: '', return_to_match: Boolean(focusMatchId) });

    const changeCategory = (value) => router.get('/admin/panitera/scoring/embu-result', { event_id: activeEvent.id, category: value }, { preserveState: false });
    const openScore = (row) => {
        setSelectedMatch(row);
        form.clearErrors();
        form.setData({
            event_id: activeEvent.id,
            judge_scores: row.score?.judge_scores?.map(String) || ['', '', '', '', ''],
            duration_seconds: row.score?.duration_seconds ?? '',
            penalty_override: '',
            tiebreak_round: row.score?.tiebreak_round ?? 0,
            notes: '',
            return_to_match: Boolean(focusMatchId),
        });
    };
    const submitScore = (event) => {
        event.preventDefault();
        form.post(`/admin/panitera/scoring/embu-result/${selectedMatch.match_id}`, { preserveScroll: true, onSuccess: () => setSelectedMatch(null) });
    };

    useEffect(() => {
        if (!focusMatchId || focusHandled.current) return;

        const focusedMatch = [...Object.values(preliminaryRankings).flat(), ...finalRankings]
            .find((row) => row.match_id === focusMatchId);

        if (focusedMatch) {
            focusHandled.current = true;
            openScore(focusedMatch);
        }
    }, [finalRankings, focusMatchId, preliminaryRankings]);
    const advanceFinalists = () => router.post(`/admin/panitera/scoring/embu-result/${selectedCategory}/advance-finalists`, { event_id: activeEvent.id }, { preserveScroll: true });
    const confirmChampions = () => router.post(`/admin/panitera/scoring/embu-result/${selectedCategory}/confirm-champions`, { event_id: activeEvent.id }, { preserveScroll: true });
    const selectedCategoryData = categories.find((category) => category.id === selectedCategory);
    const requiredChampionCount = Math.min(4, selectedCategoryData?.participant_count || 4);

    return (
        <AdminLayout title="Rekap Hasil Embu">
            <Head title="Rekap Hasil Embu | Smart Perkemi" />
            <div className="space-y-5">
                <PaniteraHeader title="Rekap & Verifikasi Hasil Embu" description="Nilai penyisihan, tie-break batas kuota, final, akumulasi, dan penetapan juara berada dalam satu alur Panitera." activeEvent={activeEvent} events={events} path="/admin/panitera/scoring/embu-result" icon="fa-ranking-star" />
                <FlashMessage flash={flash} errors={errors} />
                <CourtMonitorLinks activeEvent={activeEvent} courts={courts} />

                <section className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm">
                    <Combobox label="Nomor pertandingan Embu" value={selectedCategory || ''} onChange={changeCategory} clearable={false} options={categories.map((item) => ({ value: item.id, label: item.name, sublabel: `${item.format || 'Format belum dibuat'} · ${item.drawing_status || 'draft'}` }))} placeholder="Pilih nomor pertandingan" />
                </section>

                {champions.length > 0 && (
                    <section className="rounded-2xl border border-[#d4a843]/40 bg-gradient-to-r from-[#fff8dd] to-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#9a6b20]">Juara resmi telah dikunci</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {champions.map((champion) => <div key={champion.id} className="rounded-xl border border-[#e8dcae] bg-white p-3"><p className="text-xs font-bold text-[#9a6b20]">{champion.rank_label}</p><p className="mt-1 font-bold">{champion.contingent_name}</p></div>)}
                        </div>
                    </section>
                )}

                {selectedCategory ? (
                    <>
                        {boundaryTies.length > 0 && (
                            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><p className="font-bold"><i className="fa-solid fa-triangle-exclamation mr-2" />Final belum dapat dibuat</p><p className="mt-1">Nilai dan Juri 1 sama di batas kuota {boundaryTies.map((tie) => `Pool ${tie.pool} peringkat ${tie.rank}/${tie.next_rank}`).join(', ')}. Input nilai tanding ulang pada peserta terkait.</p></div>
                        )}

                        {Object.entries(preliminaryRankings).map(([pool, rows]) => (
                            <section key={pool} className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                                <div className="flex flex-col gap-3 border-b border-[#ede9e1] p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Klasemen Penyisihan · Pool {pool}</h2><p className="mt-0.5 text-xs text-[#7a746e]">Urutan: nilai akhir, lalu nilai Juri 1.</p></div><Badge variant="blue" className="w-fit">{quotaPerPool === 999 ? 'Final langsung' : `${quotaPerPool} lolos`}</Badge></div>
                                <RankingTable rows={rows} quota={quotaPerPool} onScore={openScore} canManage={canManage} />
                            </section>
                        ))}

                        {canManage && category?.format !== 'embu_direct_final' && (
                            <div className="flex justify-end"><Button className="w-full sm:w-auto" onClick={advanceFinalists} disabled={boundaryTies.length > 0} iconLeft={<i className="fa-solid fa-arrow-right" />}>Generate Finalis dari Klasemen</Button></div>
                        )}

                        <section className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                            <div className="flex flex-col gap-3 border-b border-[#ede9e1] p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Klasemen Babak Final</h2><p className="mt-0.5 text-xs text-[#7a746e]">Nilai akumulasi = penyisihan + final.</p></div>{hasTopFourTie && <Badge variant="red">Ada seri 4 besar</Badge>}</div>
                            <RankingTable rows={finalRankings} final onScore={openScore} canManage={canManage} />
                        </section>

                        {canManage && finalRankings.length >= requiredChampionCount && champions.length === 0 && <div className="flex justify-end"><Button className="w-full sm:w-auto" variant="gold" onClick={confirmChampions} disabled={hasTopFourTie} iconLeft={<i className="fa-solid fa-crown" />}>Konfirmasi Hasil Juara</Button></div>}
                    </>
                ) : <div className="rounded-2xl border border-dashed border-[#d9d3c9] bg-white p-8 text-center text-sm text-[#7a746e] sm:p-12">Belum ada drawing kategori Embu untuk event ini.</div>}
            </div>

            <Modal isOpen={Boolean(selectedMatch)} onClose={() => !form.processing && setSelectedMatch(null)} title="Input Nilai Embu" subtitle={selectedMatch?.participant_label} size="2xl" footer={<><Button variant="outline" onClick={() => setSelectedMatch(null)}>Batal</Button><Button type="submit" form="embu-score-form" loading={form.processing}>Verifikasi & Simpan</Button></>}>
                <form id="embu-score-form" onSubmit={submitScore} className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                        {form.data.judge_scores.map((value, index) => <Input key={index} label={`Juri ${index + 1}`} type="number" min="0" max="100" step="0.01" required value={value} error={form.errors[`judge_scores.${index}`]} onChange={(event) => { const scores = [...form.data.judge_scores]; scores[index] = event.target.value; form.setData('judge_scores', scores); }} />)}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Input label="Durasi (detik)" type="number" min="0" max="600" value={form.data.duration_seconds} error={form.errors.duration_seconds} onChange={(event) => form.setData('duration_seconds', event.target.value)} hint="Denda otomatis mengikuti Tandoku atau Pasangan/Beregu." />
                        <Input label="Override denda" type="number" min="0" max="100" step="0.01" value={form.data.penalty_override} error={form.errors.penalty_override} onChange={(event) => form.setData('penalty_override', event.target.value)} hint="Kosongkan agar dihitung otomatis." />
                        <Input label="Putaran tie-break" type="number" min="0" max="20" value={form.data.tiebreak_round} error={form.errors.tiebreak_round} onChange={(event) => form.setData('tiebreak_round', event.target.value)} hint="0 untuk pertandingan normal; 1+ untuk tanding ulang." />
                    </div>
                    <Input label="Catatan Panitera" value={form.data.notes} error={form.errors.notes} onChange={(event) => form.setData('notes', event.target.value)} />
                </form>
            </Modal>
        </AdminLayout>
    );
}
