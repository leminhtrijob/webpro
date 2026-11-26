export class AudioManager {
    constructor() {
        this.defaultAudioUrl = '/demo/music/romantic.mp3';
        this.audio = document.getElementById('bg-audio') || new Audio();
        this.audio.loop = true;
        this.audio.preload = 'auto';
        this.audio.src = this.defaultAudioUrl;
        this.isPlaying = false;
    }

    setAudioUrl(url) {
        if (!url) return;
        const resolved = (url.startsWith('http') || url.startsWith('/'))
            ? url
            : '/demo/music/romantic.mp3';
        this.audio.src = resolved;
        this.audio.load();
    }

    playOnly() {
        if (!this.audio) return;
        this.audio.play().then(() => {
            this.isPlaying = true;
        }).catch(() => {});
    }

    toggle() {
        if (!this.audio) return;
        if (this.audio.paused) {
            this.playOnly();
        } else {
            this.audio.pause();
            this.isPlaying = false;
        }
    }
}
