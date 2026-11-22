import { useEffect, useState } from 'react';
import { embuAthletes, embuParticipantLayout, participantInitials } from '../courtMonitorPresentation';

function AthletePhoto({ athlete, compact }) {
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [athlete.photo_url]);

    return (
        <div className={`${compact ? 'w-24 sm:w-28' : 'w-28 sm:w-36 lg:w-40'} flex shrink-0 self-stretch items-center justify-center overflow-hidden rounded-xl border border-stone-300 bg-stone-200 text-2xl font-black text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-white/70`}>
            {athlete.photo_url && !imageFailed ? (
                <img
                    src={athlete.photo_url}
                    alt={`Foto ${athlete.name}`}
                    width="320"
                    height="400"
                    className="h-full min-h-28 w-full object-cover object-top"
                    onError={() => setImageFailed(true)}
                />
            ) : participantInitials(athlete.name, 'AT')}
        </div>
    );
}

export default function EmbuParticipantPanel({ match, className = '', compact = false }) {
    const athletes = embuAthletes(match);
    const layout = embuParticipantLayout(athletes.length);

    return (
        <article className={`flex min-h-0 flex-col rounded-2xl border border-stone-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.07)] dark:border-white/10 dark:bg-[#151210] ${compact ? 'p-4' : 'p-5 sm:p-6'} ${className}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300 sm:text-xs">Peserta Embu</p>
                    <h2 className={`${compact ? 'mt-1.5 text-xl sm:text-2xl' : 'mt-2 text-2xl sm:text-3xl'} break-words font-black leading-tight text-[#071126] dark:text-white`}>
                        {match.participant_label || 'Peserta belum ditentukan'}
                    </h2>
                </div>
                <span className="inline-flex min-h-8 shrink-0 items-center self-start rounded-lg bg-amber-100 px-3 text-xs font-black text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
                    {athletes.length} atlet
                </span>
            </div>

            <ol className={`grid min-h-0 flex-1 auto-rows-fr gap-3 ${compact ? 'mt-4' : 'mt-5'} ${layout.usesTwoColumns ? 'sm:grid-cols-2' : 'grid-cols-1'}`} aria-label="Daftar atlet Embu">
                {athletes.map((athlete, index) => (
                    <li key={athlete.id || `${athlete.name}-${index}`} className={`flex min-h-36 min-w-0 gap-3 overflow-hidden rounded-xl border border-stone-200 bg-[#f7f4ee] p-3 dark:border-white/10 dark:bg-white/5 ${layout.fullWidthFinalIndex === index ? 'sm:col-span-2' : ''}`}>
                        <AthletePhoto athlete={athlete} compact={compact} />
                        <div className="flex min-w-0 flex-1 flex-col justify-center py-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-sm font-black text-[#071126]">{index + 1}</span>
                            <span className={`${compact ? 'mt-3 text-base sm:text-lg' : 'mt-4 text-lg sm:text-xl'} min-w-0 break-words font-black leading-tight text-slate-900 dark:text-white`}>{athlete.name}</span>
                        </div>
                    </li>
                ))}
                {athletes.length === 0 && (
                    <li className="rounded-xl border border-dashed border-stone-300 px-4 py-5 text-base font-semibold text-slate-600 dark:border-white/15 dark:text-white/60 sm:col-span-2">
                        Nama atlet belum tersedia pada data peserta.
                    </li>
                )}
            </ol>
        </article>
    );
}
