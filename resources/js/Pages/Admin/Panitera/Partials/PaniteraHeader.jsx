import Combobox from '@/Components/UI/Forms/Combobox';
import { router } from '@inertiajs/react';

export default function PaniteraHeader({ title, description, icon = 'fa-clipboard-check', activeEvent, events = [], path }) {
    const destination = path.includes('embu-result') ? 'embu' : path.includes('randori-result') ? 'randori' : 'dashboard';

    return (
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f0d0b] via-[#211b16] to-[#0f0d0b] p-5 text-white shadow-xl md:p-6">
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#d4a843]/15 blur-3xl" />
            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#e1b94e] sm:text-xs sm:tracking-[.14em]">
                        <i className={`fa-solid ${icon}`} aria-hidden="true" />
                        Sistem Panitera per Event
                    </p>
                    <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight md:text-3xl">{title}</h1>
                    <p className="mt-2.5 text-sm leading-relaxed text-white/70">{description}</p>
                    {activeEvent && (
                        <p className="mt-3 flex w-full items-start gap-2 rounded-xl border border-[#d4a843]/30 bg-[#d4a843]/10 px-3 py-2 text-xs font-semibold leading-relaxed text-[#f0c060] sm:inline-flex sm:w-auto sm:items-center sm:rounded-full sm:py-1">
                            <i className="fa-solid fa-trophy" aria-hidden="true" />
                            <span className="min-w-0 break-words">{activeEvent.name} · {activeEvent.city}</span>
                        </p>
                    )}
                </div>
                <Combobox
                    label="Event dipilih"
                    labelClassName="text-white/60"
                    containerClassName="w-full xl:w-96"
                    value={activeEvent?.id || ''}
                    onChange={(value) => router.post('/admin/panitera/event-context', { event_id: value, destination }, { preserveState: false })}
                    clearable={false}
                    options={events.map((event) => ({
                        value: event.id,
                        label: event.name,
                        sublabel: [event.status_label, event.date_label, event.city].filter(Boolean).join(' · '),
                    }))}
                />
            </div>
        </section>
    );
}
