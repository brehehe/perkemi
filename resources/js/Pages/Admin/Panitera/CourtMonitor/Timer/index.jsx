import EmptyState from '../Shared/EmptyState';
import { timerStatusLabel } from '../courtMonitorPresentation';

export default function TimerMode({ match, court, timerText, isExpired, timerDirection }) {
    if (!match) return <EmptyState court={court} />;

    return (
        <section className={`flex min-h-[60dvh] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 px-4 py-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.09)] sm:px-8 lg:min-h-full ${isExpired ? 'border-red-600 bg-red-50 dark:bg-red-950/25' : 'border-stone-200 bg-white dark:border-white/10 dark:bg-[#151210]'}`}>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-800 dark:text-amber-300 sm:text-sm">
                {timerDirection === 'down' ? 'Hitung mundur' : 'Hitung maju'} · {timerStatusLabel(match.timer, isExpired)}
            </p>
            <p className={`mt-4 max-w-full font-mono text-[clamp(4.5rem,18vw,13rem)] font-black leading-[0.84] tracking-[-0.1em] tabular-nums ${isExpired ? 'text-red-700 dark:text-red-400' : 'text-[#071126] dark:text-white'}`} aria-live="off">
                {timerText}
            </p>
            <h2 className="mt-6 max-w-5xl text-xl font-black leading-tight text-[#071126] dark:text-white sm:text-3xl">
                {isExpired ? 'WAKTU HABIS' : match.category_name}
            </h2>
            <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-white/50 sm:text-base">Partai #{match.sequence} · {match.round_label}</p>
        </section>
    );
}
