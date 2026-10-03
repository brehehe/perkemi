import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

// Mendeteksi otomatis apakah diakses via HTTPS (wss) atau HTTP (ws)
const isHttps = (import.meta.env.VITE_REVERB_SCHEME ?? window.location.protocol.replace(':', '')) === 'https';

// The local UI does not need a socket until the Reverb process is explicitly enabled.
const connectInThisEnvironment = import.meta.env.VITE_REVERB_ENABLED === 'true'
    || (!import.meta.env.DEV && import.meta.env.VITE_REVERB_ENABLED !== 'false');

if (connectInThisEnvironment && import.meta.env.VITE_REVERB_APP_KEY) {
    try {
        window.Echo = new Echo({
            broadcaster: 'reverb',
            key: import.meta.env.VITE_REVERB_APP_KEY,
            // Jika VITE_REVERB_HOST kosong, otomatis gunakan window.location.hostname (mendukung localhost & IP local secara dinamis)
            wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
            wsPort: import.meta.env.VITE_REVERB_PORT ? Number(import.meta.env.VITE_REVERB_PORT) : 8080,
            wssPort: import.meta.env.VITE_REVERB_PORT ? Number(import.meta.env.VITE_REVERB_PORT) : 8080,
            forceTLS: isHttps,
            enabledTransports: ['ws', 'wss'],
        });
    } catch (err) {
        console.warn('Reverb WebSocket not running, live broadcasting disabled.');
    }
}
