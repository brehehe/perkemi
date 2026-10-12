export default function FlashMessage({ flash = {}, errors = {} }) {
    const messages = Object.values(errors || {}).flatMap((message) => Array.isArray(message) ? message : [message]);

    if (!flash.success && !flash.error && messages.length === 0) {
        return null;
    }

    const isError = Boolean(flash.error || messages.length);

    return (
        <div
            role={isError ? 'alert' : 'status'}
            aria-live="polite"
            className={`rounded-xl border p-4 text-sm ${isError ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}
        >
            <div className="flex items-start gap-3">
                <i className={`fa-solid ${isError ? 'fa-circle-exclamation text-rose-600' : 'fa-circle-check text-emerald-600'} mt-0.5`} aria-hidden="true" />
                <div className="font-semibold">
                    {flash.error || flash.success}
                    {messages.length > 0 && (
                        <ul className="list-disc space-y-1 pl-5">
                            {messages.map((message) => <li key={message}>{message}</li>)}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
