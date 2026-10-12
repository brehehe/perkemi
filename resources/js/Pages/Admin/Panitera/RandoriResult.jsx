import Badge from '@/Components/UI/Elements/Badge';
import Combobox from '@/Components/UI/Forms/Combobox';
import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessage from './Partials/FlashMessage';
import CourtMonitorLinks from './Partials/CourtMonitorLinks';
import PaniteraHeader from './Partials/PaniteraHeader';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useMemo } from 'react';

export default function RandoriResult({ activeEvent, events = [], courts = [], categories = [], selectedCategory, matches = [], canManage = false }) {
    const { flash = {}, errors = {} } = usePage().props;
    const category = categories.find((item) => item.id === selectedCategory);
    const matchesByRound = useMemo(() => matches.reduce((groups, match) => ({
        ...groups,
        [match.round_label]: [...(groups[match.round_label] || []), match],
    }), {}), [matches]);
    const changeCategory = (value) => router.get('/admin/panitera/scoring/randori-result', { event_id: activeEvent.id, category: value }, { preserveState: false });

    return (
        <AdminLayout title="Hasil Randori">
            <Head title="Hasil Randori | Smart Perkemi" />
            <div className="space-y-5">
                <PaniteraHeader title="Hasil Randori" description="Pantau hasil dan bagan Randori. Input nilai serta pengesahan enam pihak dilakukan langsung dari detail partai." activeEvent={activeEvent} events={events} path="/admin/panitera/scoring/randori-result" icon="fa-hand-fist" />
                <FlashMessage flash={flash} errors={errors} />
                <CourtMonitorLinks activeEvent={activeEvent} courts={courts} />

                <section className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm">
                    <Combobox label="Nomor pertandingan Randori" value={selectedCategory || ''} onChange={changeCategory} clearable={false} options={categories.map((item) => ({ value: item.id, label: item.name, sublabel: `${item.format?.replaceAll('_', ' ') || 'Format belum dibuat'} · ${item.drawing_status || 'draft'}` }))} placeholder="Pilih nomor pertandingan" />
                    {category && <div className="mt-3 flex flex-wrap gap-2"><Badge variant="red">Randori</Badge><Badge variant="blue">{category.format?.replaceAll('_', ' ')}</Badge><Badge variant="gray">{matches.filter((match) => match.score).length}/{matches.length} selesai</Badge></div>}
                </section>

                {selectedCategory ? (
                    <div className="space-y-4">
                        {Object.entries(matchesByRound).map(([round, roundMatches]) => (
                            <section key={round} className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                                <div className="flex flex-col gap-3 border-b border-[#ede9e1] bg-[#fbfaf8] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#9a6b20]">Bagan {category?.format?.replaceAll('_', ' ')}</p><h2 className="mt-1 font-bold">{round}</h2></div><Badge variant="gray" className="w-fit">{roundMatches.length} partai</Badge></div>
                                <div className="divide-y divide-[#ede9e1]">
                                    {roundMatches.map((match) => (
                                        <article key={match.id} className="p-4">
                                            <div className="grid gap-4 lg:grid-cols-[100px_1fr_auto] lg:items-center">
                                                <div><p className="text-xs font-bold text-[#9a6b20]">Partai #{match.sequence}</p><p className="mt-1 text-[11px] text-[#7a746e]">{match.scheduled_at || 'Belum dijadwalkan'}<br />{match.court || 'Court belum dipilih'}</p></div>
                                                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch overflow-hidden rounded-xl border border-[#e5ded4]">
                                                    <div className={`min-w-0 p-2.5 sm:p-3 ${match.score?.winner_corner === 'aka' ? 'bg-emerald-50' : 'bg-rose-50/50'}`}><p className="text-[10px] font-bold uppercase text-rose-700">AKA</p><p className="mt-1 break-words text-xs font-bold sm:text-sm">{match.aka_label}</p>{match.score && <p className="mt-2 text-2xl font-black">{match.score.aka_total}</p>}</div>
                                                    <div className="flex items-center border-x border-[#e5ded4] px-2 text-[10px] font-black text-[#9b9188] sm:px-3 sm:text-xs">VS</div>
                                                    <div className={`min-w-0 p-2.5 text-right sm:p-3 ${match.score?.winner_corner === 'shiro' ? 'bg-emerald-50' : 'bg-slate-50'}`}><p className="text-[10px] font-bold uppercase text-slate-600">SHIRO</p><p className="mt-1 break-words text-xs font-bold sm:text-sm">{match.shiro_label}</p>{match.score && <p className="mt-2 text-2xl font-black">{match.score.shiro_total}</p>}</div>
                                                </div>
                                                <div className="flex w-full flex-col items-stretch gap-2 lg:min-w-32 lg:w-auto">
                                                    {match.score ? <Badge variant={match.score.is_locked ? 'gray' : 'green'} className="justify-center">{match.score.is_locked ? 'Terkunci' : 'Belum dikunci'}</Badge> : <Badge variant={match.is_ready ? 'yellow' : 'gray'} className="justify-center">{match.is_ready ? 'Siap dinilai' : 'Menunggu pemenang'}</Badge>}
                                                    {canManage && match.is_ready && (
                                                        <Link href={`/admin/panitera/scoring/matches/${match.id}?event_id=${encodeURIComponent(activeEvent.id)}`} className={`inline-flex min-h-10 w-full items-center justify-center rounded-lg border px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c0392b] ${match.score ? 'border-[#d8c9ae] bg-white text-[#5b5148] hover:bg-[#fbfaf8]' : 'border-[#c0392b] bg-[#c0392b] text-white hover:bg-[#a82718]'}`}>{match.score?.is_locked ? 'Lihat Hasil' : match.score ? 'Buka & Ubah' : 'Buka Partai'}</Link>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                ) : <div className="rounded-2xl border border-dashed border-[#d9d3c9] bg-white p-8 text-center text-sm text-[#7a746e] sm:p-12">Belum ada drawing kategori Randori untuk event ini.</div>}
            </div>
        </AdminLayout>
    );
}
