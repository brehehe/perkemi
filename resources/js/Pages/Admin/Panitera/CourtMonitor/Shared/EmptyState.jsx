export default function EmptyState({ court, title = 'Menunggu Panggilan', detail }) {
    return (
        <section className="flex min-h-[48dvh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-white/15 dark:bg-[#151210] lg:min-h-full">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-2xl text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
                <i className="fa-solid fa-hourglass-start" aria-hidden="true" />
            </span>
            <h2 className="mt-6 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">{title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-white/60 sm:text-base">
                {detail || `Belum ada partai aktif di ${court.name}. Layar diperbarui otomatis saat Panitera memanggil peserta.`}
            </p>
        </section>
    );
}
