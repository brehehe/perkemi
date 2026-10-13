import Button from '@/Components/UI/Elements/Button';

export default function TimerBellControls({ bell }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Button variant={bell.enabled ? 'gold' : 'secondary'} size="sm" aria-pressed={bell.enabled} onClick={bell.toggle}
                iconLeft={<i className={`fa-solid ${bell.enabled ? 'fa-volume-high' : 'fa-volume-xmark'}`} aria-hidden="true" />}>
                {bell.enabled ? 'Bel Aktif' : 'Aktifkan Bel'}
            </Button>
            <Button variant="secondary" size="sm" onClick={bell.test} iconLeft={<i className="fa-solid fa-bell" aria-hidden="true" />}>Tes Bel</Button>
            {bell.error && <p role="status" className="w-full text-xs text-rose-600 dark:text-rose-300">{bell.error}</p>}
        </div>
    );
}
