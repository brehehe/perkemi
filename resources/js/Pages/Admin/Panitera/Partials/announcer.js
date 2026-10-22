// 🎙️ PUBLIC ADDRESS SYSTEM (TTS) & TIMER SOUND HELPERS FOR PERKEMI

export const ANNOUNCER_BEEP_URL = '/asset/music/nada-suara.mp3';
export const DEFAULT_BUZZER_URL = '/bel/freesound_community-buzzerwav-14908.mp3';

let isPlayingAnnouncer = false;
let currentAudio = null;

export function formatAnnouncerText(text) {
    if (!text) return '';
    return String(text)
        .toLowerCase()
        .replace(/\./g, '. ')
        .replace(/,/g, ', ')
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function notifyState(isPlaying, text = '') {
    isPlayingAnnouncer = isPlaying;
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('announcer-state-changed', {
            detail: { isPlaying, text }
        }));
    }
}

export function stopAnnouncer() {
    isPlayingAnnouncer = false;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    if (currentAudio) {
        try {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        } catch {
            // Ignore audio pause errors
        }
        currentAudio = null;
    }
    notifyState(false);
    console.log('Announcer stopped manually.');
}

export function speak(rawText, onComplete) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.warn('SpeechSynthesis is not supported in this environment.');
        onComplete?.();
        return;
    }

    const text = formatAnnouncerText(rawText);
    console.log('Attempting to speak:', text);

    if (!isPlayingAnnouncer) {
        console.warn('Announcer is not playing, skipping speak.');
        onComplete?.();
        return;
    }

    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'id-ID';
    speech.rate = 1.1;
    speech.pitch = 1;
    speech.volume = 1;

    function setVoice() {
        const voices = window.speechSynthesis.getVoices();
        console.log('Voices available:', voices.length);
        let voice = voices.find(v => v.name.includes('Google Bahasa Indonesia')) ||
            voices.find(v => v.lang === 'id-ID') ||
            voices[0];

        if (voice) {
            console.log('Selected voice:', voice.name);
            speech.voice = voice;
        }

        speech.onstart = () => {
            console.log('TTS started.');
            notifyState(true, text);
        };
        speech.onend = () => {
            console.log('TTS ended.');
            stopAnnouncer();
            onComplete?.();
        };
        speech.onerror = (e) => {
            console.error('TTS error:', e);
            stopAnnouncer();
            onComplete?.();
        };

        window.speechSynthesis.speak(speech);
    }

    if (window.speechSynthesis.getVoices().length) {
        setVoice();
    } else {
        console.log('Waiting for voices to be loaded...');
        window.speechSynthesis.onvoiceschanged = setVoice;
        // Fallback if onvoiceschanged doesn't fire promptly
        setTimeout(() => {
            if (!speech.voice && window.speechSynthesis.getVoices().length) {
                setVoice();
            }
        }, 300);
    }
}

export function playBeepAndSpeak(rawText, onComplete) {
    if (typeof window === 'undefined') return;

    const text = formatAnnouncerText(rawText);
    stopAnnouncer(); // ⛔ pastikan tidak numpuk
    isPlayingAnnouncer = true;
    notifyState(true, text);

    try {
        currentAudio = new Audio(ANNOUNCER_BEEP_URL);
        currentAudio.volume = 0.6;

        let playPromise = currentAudio.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                currentAudio.onended = () => {
                    if (!isPlayingAnnouncer) return;
                    setTimeout(() => speak(text, onComplete), 500);
                };
            }).catch(() => {
                // Jika audio gagal/tidak ada, langsung bicara
                speak(text, onComplete);
            });
        } else {
            // Fallback untuk browser lama
            speak(text, onComplete);
        }
    } catch {
        speak(text, onComplete);
    }
}

export function playBuzzer(src = DEFAULT_BUZZER_URL) {
    if (typeof window === 'undefined') return;
    try {
        const audio = new Audio(src);
        audio.play().catch(e => console.warn('Buzzer error:', e));
    } catch (e) {
        console.warn('Audio error:', e);
    }
}

export function playBuzzerSingle(src = DEFAULT_BUZZER_URL) {
    playBuzzer(src);
}

export function playBuzzerDouble(src = DEFAULT_BUZZER_URL) {
    playBuzzer(src);
    setTimeout(() => playBuzzer(src), 800);
}

export function playTimerTick(frequency = 1000, duration = 0.08) {
    // User requested to remove tick tick tick
}

export function speakCountdown(text) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (window.speechSynthesis.speaking) return;
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'id-ID';
    speech.rate = 1.8;
    speech.pitch = 1.2;
    window.speechSynthesis.speak(speech);
}

// 🎯 Perkemi Announcement Sentence Builders
export function getOfficialCallText(match, callNumber = 1) {
    const category = match?.category_name || 'pertandingan';
    const sequence = match?.sequence ? `partai nomor ${match.sequence}` : '';
    const court = match?.court ? `di ${match.court}` : '';

    if (callNumber <= 1) {
        return `Perhatian. Panggilan kepada para wasit dan ofisial pertandingan, kategori ${category}, ${sequence}, ${court}. Dimohon untuk segera memasuki court.`;
    }
    return `Perhatian. Panggilan ke ${callNumber} kepada para wasit dan ofisial pertandingan, kategori ${category}, ${sequence}, ${court}. Dimohon untuk segera memasuki court.`;
}

export function getParticipantCallText(match, callNumber = 1) {
    const category = match?.category_name || 'pertandingan';
    const sequence = match?.sequence ? `partai nomor ${match.sequence}` : '';
    const court = match?.court ? `di ${match.court}` : '';

    if (match?.category_type === 'randori') {
        const aka = match?.aka_label || 'Sudut Merah';
        const shiro = match?.shiro_label || 'Sudut Putih';
        if (callNumber <= 1) {
            return `Perhatian. Panggilan kepada peserta Randori kategori ${category}, ${sequence}, sudut merah ${aka}, dan sudut putih ${shiro}, ${court}. Dimohon untuk segera bersiap dan memasuki court.`;
        }
        return `Perhatian. Panggilan ke ${callNumber} kepada peserta Randori kategori ${category}, ${sequence}, sudut merah ${aka}, dan sudut putih ${shiro}, ${court}. Dimohon untuk segera memasuki court.`;
    }

    // Embu
    const participant = match?.participant_label || 'peserta';
    if (callNumber <= 1) {
        return `Perhatian. Panggilan kepada peserta ${participant}, kategori ${category}, ${sequence}, ${court}. Dimohon untuk segera bersiap dan memasuki court.`;
    }
    return `Perhatian. Panggilan ke ${callNumber} kepada peserta ${participant}, kategori ${category}, ${sequence}, ${court}. Dimohon untuk segera memasuki court.`;
}

// Global browser event listener and window method binding
if (typeof window !== 'undefined') {
    window.stopAnnouncer = stopAnnouncer;
    window.playBuzzer = playBuzzer;
    window.playBuzzerSingle = playBuzzerSingle;
    window.playBuzzerDouble = playBuzzerDouble;
    window.playTimerTick = playTimerTick;
    window.speakCountdown = speakCountdown;
    window.formatAnnouncerText = formatAnnouncerText;

    window.playAnnouncer = function(text) {
        window.dispatchEvent(new CustomEvent('play-announcer', { detail: { text } }));
    };

    window.addEventListener('play-announcer', event => {
        console.log('Announcer event received:', event.detail);
        const detail = event.detail;
        const rawText = Array.isArray(detail)
            ? (detail[0]?.text || detail[0])
            : (typeof detail === 'object' && detail !== null ? (detail.text || detail.message) : detail);
        if (rawText) {
            playBeepAndSpeak(rawText);
        }
    });

    // Pancing AudioContext agar aktif saat ada klik pertama di halaman
    document.addEventListener('click', function() {
        if (window.sharedAudioCtx && window.sharedAudioCtx.state === 'suspended') {
            window.sharedAudioCtx.resume();
        }
    }, {
        once: true
    });
}
