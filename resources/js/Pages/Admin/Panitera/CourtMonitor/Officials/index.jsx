import EmptyState from '../Shared/EmptyState';
import { participantInitials } from '../courtMonitorPresentation';

export default function OfficialsMode({ staff = [], court }) {
    const officials = staff
        .filter((member) => member.judge_number !== null && member.judge_number !== undefined)
        .slice(0, 5);

    if (officials.length === 0) {
        return <EmptyState court={court} title="Ofisial Belum Ditugaskan" detail={`Wasit dan juri untuk ${court.name} belum tersedia.`} />;
    }

    return (
        <section className="min-h-full rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] dark:border-white/10 dark:bg-[#151210] sm:p-6">
            <div className="text-center">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300">Susunan wasit dan juri</p>
                <h2 className="mt-2 text-2xl font-black text-[#071126] dark:text-white sm:text-4xl">{court.name}</h2>
                <p className="mt-2 text-sm font-medium text-slate-600 dark:text-white/50">Urutan resmi dari Wasit Utama hingga Juri 5</p>
            </div>
            <div className="mx-auto mt-6 grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {officials.map((member) => (
                    <article key={member.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-[#f7f4ee] dark:border-white/10 dark:bg-white/5">
                        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-stone-200 text-4xl font-black text-amber-800 dark:bg-black/20 dark:text-amber-300">
                            {member.photo_url ? (
                                <img src={member.photo_url} alt={`Foto ${member.name}`} width="360" height="270" className="h-full w-full object-cover" />
                            ) : participantInitials(member.name, 'WS')}
                        </div>
                        <div className="p-4">
                            <div className="flex items-center justify-between gap-2">
                                <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-900">Juri {member.judge_number}</span>
                                <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black ${member.is_present ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-slate-700'}`}>
                                    {member.is_present ? 'Hadir' : 'Belum scan'}
                                </span>
                            </div>
                            <h3 className="mt-4 text-lg font-black leading-tight text-[#071126] dark:text-white">{member.name}</h3>
                            <p className="mt-2 text-sm font-bold text-amber-800 dark:text-amber-300">{member.role}</p>
                            {(member.certification || member.region) && <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-white/50">{[member.certification, member.region].filter(Boolean).join(' · ')}</p>}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
